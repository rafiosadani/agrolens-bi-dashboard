"""
Default Sales Query Builder
Standard ERP and Financial query strategy for standard entities.
"""

from typing import List
from app.services.query_builders.base_builder import BaseSalesQueryBuilder


class DefaultSalesQueryBuilder(BaseSalesQueryBuilder):
    """Default strategy for standard raw ERP entities where Financial Layer mirrors Net ERP calculation."""

    def build_financial_monthly_query(self, year: int, months: List[int], segment: str = "all") -> str:
        """
        Builds Financial Layer query using accounting period expression (Roman numerals)
        for standard entities.
        """
        date_cond = self.build_date_condition(year)
        aff_clause = self.build_affiliate_clause(segment)
        months_str = ", ".join(str(m) for m in months)
        period_expr = self.build_period_expression("sih.NoBukti", "sih.TglFaktur")

        return f"""
            WITH RawCombinedData AS (
                SELECT
                    '{self.entity_code}' AS [PT],
                    {year} AS TahunDb,
                    LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice, 
                    CAST(sih.TglFaktur AS DATE) AS TglTrn,
                    {period_expr} AS Bln,
                    sii.Qty AS Qty,
                    COALESCE(NULLIF(sii.HargaNet, 0), 
                        (((sii.HargaJual * (1.0 - ISNULL(sii.ItemDisPsn, 0)/100.0)) - ISNULL(sii.ItemDisc, 0)) 
                         * (1.0 - ISNULL(sii.ItemDisPsn2, 0)/100.0) - ISNULL(sii.ItemDisc2, 0)) 
                        * (1.0 - ISNULL(sii.ItemDisPsn3, 0)/100.0) - ISNULL(sii.ItemDisc3, 0)
                    ) AS BaseHargaNet,
                    CASE 
                        WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I' THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0
                        ELSE 1.0
                    END AS PpnDivider,
                    ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
                    sii.SalesInvoiceItemId AS TransactionItemId
                FROM [{self.db_name}].[dbo].[SalesInvoiceItems] sii
                INNER JOIN [{self.db_name}].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
                LEFT JOIN [{self.db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                WHERE {date_cond}
                  {aff_clause}
            ),
            CalculatedNet AS (
                SELECT 
                    *,
                    (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal,
                    SUM(Qty * BaseHargaNet / PpnDivider) OVER (PARTITION BY NoInvoice) AS InvoiceTotalSubtotal
                FROM RawCombinedData
            ),
            FinalNetPrice AS (
                SELECT 
                    *,
                    CASE 
                        WHEN InvoiceTotalSubtotal > 0 THEN 
                            (BaseHargaNet / PpnDivider) - (((Qty * BaseHargaNet / PpnDivider) / InvoiceTotalSubtotal) * HeaderExtDisc / NULLIF(Qty, 0))
                        ELSE 
                            (BaseHargaNet / PpnDivider)
                    END AS HargaJualNet
                FROM CalculatedNet
            ),
            RankedData AS (
                SELECT *,
                    ROW_NUMBER() OVER (
                        PARTITION BY TahunDb, TransactionItemId, NoInvoice
                        ORDER BY CASE WHEN YEAR(TglTrn) = TahunDb THEN 0 ELSE 1 END, TahunDb DESC
                    ) AS rn
                FROM FinalNetPrice
            )
            SELECT 
                Bln, 
                ROUND(SUM(Qty * HargaJualNet), 2) AS MonthlyOmzet
            FROM RankedData
            WHERE rn = 1 AND Bln IN ({months_str})
            GROUP BY Bln
            ORDER BY Bln
        """

