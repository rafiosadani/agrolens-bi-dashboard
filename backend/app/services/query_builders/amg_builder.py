"""
AMG Sales Query Builder
Custom query strategies for PT Agrochem Mega Globalindo (AGC/AMG).
Implements official audited adjustments:
- 2026: Excludes 6 ERP-only invoices, maps 291/INV, applies RS-% discounts, and handles 5 returns in CTE 'Tambah'.
- 2025: Excludes non-commercial transport claim 391/INV/AMG-ANR/VIII/25 from financial affiliate sales.
"""

from typing import List
from app.services.query_builders.base_builder import BaseSalesQueryBuilder


class AMGQueryBuilder(BaseSalesQueryBuilder):
    """Query builder tailored specifically for PT Agrochem Mega Globalindo."""

    def __init__(self, db_name: str = "AGCdb003"):
        super().__init__(entity_code="AMG", db_name=db_name)

    def build_financial_monthly_query(self, year: int, months: List[int], segment: str = "all") -> str:
        """Generates Financial Layer query for AMG across 2024, 2025, and 2026."""
        months_str = ", ".join(str(m) for m in months)
        aff_clause = self.build_affiliate_clause(segment)

        if year == 2026:
            # 2026 Financial Adjusted Model
            if segment != "affiliate":
                tambah_clause = f""",
                Tambah AS (
                    SELECT 
                        v.periode AS Bln,
                        CAST(v.nilai AS DECIMAL(18,2)) AS Penjualan
                    FROM (VALUES
                        ('063/INV/AMG-RHM/II/26',          2, -1038240),
                        ('068/INV/AMG-WKS/II/26',          2, -1038240),
                        ('068/INV/AMG-WKS/II/26',          2, -11500000),
                        ('075/INV/AMG-PBLP/II/26',         2, -193550),
                        ('223/INV/AMG-BAM/V/26 REVISI INV',5, -377000)
                    ) v(inv, periode, nilai)
                    WHERE v.periode IN ({months_str})
                ),
                Combined AS (
                    SELECT Bln, Penjualan FROM Base
                    UNION ALL
                    SELECT Bln, Penjualan FROM Tambah
                )"""
            else:
                tambah_clause = """,
                Combined AS (
                    SELECT Bln, Penjualan FROM Base
                )"""

            return f"""
                WITH RawCombinedData AS (
                    SELECT
                        'AMG' AS [PT], 2026 AS TahunDb,
                        LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice, 
                        CAST(sih.TglFaktur AS DATE) AS TglTrn,
                        CASE 
                            WHEN sih.NoBukti LIKE '%/XII/%' OR sih.NoBukti LIKE '%-XII-%' THEN 12
                            WHEN sih.NoBukti LIKE '%/XI/%'  OR sih.NoBukti LIKE '%-XI-%'  THEN 11
                            WHEN sih.NoBukti LIKE '%/X/%'   OR sih.NoBukti LIKE '%-X-%'   THEN 10
                            WHEN sih.NoBukti LIKE '%/IX/%'  OR sih.NoBukti LIKE '%-IX-%'  THEN 9
                            WHEN sih.NoBukti LIKE '%/VIII/%' OR sih.NoBukti LIKE '%-VIII-%' THEN 8
                            WHEN sih.NoBukti LIKE '%/VII/%' OR sih.NoBukti LIKE '%-VII-%' THEN 7
                            WHEN sih.NoBukti LIKE '%/VI/%'  OR sih.NoBukti LIKE '%-VI-%'  THEN 6
                            WHEN sih.NoBukti LIKE '%/V/%'   OR sih.NoBukti LIKE '%-V-%'   THEN 5
                            WHEN sih.NoBukti LIKE '%/IV/%'  OR sih.NoBukti LIKE '%-IV-%'  THEN 4
                            WHEN sih.NoBukti LIKE '%/III/%' OR sih.NoBukti LIKE '%-III-%' THEN 3
                            WHEN sih.NoBukti LIKE '%/II/%'  OR sih.NoBukti LIKE '%-II-%'  THEN 2
                            WHEN sih.NoBukti LIKE '%/I/%'   OR sih.NoBukti LIKE '%-I-%'   THEN 1
                            ELSE MONTH(sih.TglFaktur)
                        END AS Bln,
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
                    WHERE sih.TglFaktur >= '2026-01-01' AND sih.TglFaktur < '2027-01-01'
                      {aff_clause}
                      AND LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) NOT IN (
                          '421.1/INV/AMG-ANR/VIII/26',
                          '421.2/INV/AMG-ANR/VIII/26',
                          '436/INV/AMG-BLS/IX/26(PPN KELUARAN)',
                          '376/INV/AMG-MAR/VIII/26(1)',
                          '387/INV/AMG-ASL/VIII/26 (1)',
                          '236/INV/AMG-GH/V/26(1)'
                      )
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
                ),
                Base AS (
                    SELECT 
                        r.Bln,
                        ROUND(CASE 
                            WHEN r.NoInvoice = '291/INV/AMG-AP/V/26' THEN 
                                (r.Qty * r.HargaJualNet) - 100000000.00
                            WHEN r.NoInvoice LIKE 'RS-%' THEN 
                                -1 * (r.Qty * r.HargaJualNet)
                            ELSE 
                                (r.Qty * r.HargaJualNet)
                        END, 2) AS Penjualan
                    FROM RankedData r
                    WHERE r.rn = 1
                )
                {tambah_clause}
                SELECT Bln, ROUND(SUM(Penjualan), 2) AS MonthlyOmzet
                FROM Combined
                WHERE Bln IN ({months_str})
                GROUP BY Bln
                ORDER BY Bln
            """

        elif year == 2025:
            # 2025 Financial Model: Exclude nota 391 when calculating affiliate
            extra_excl = ""
            if segment == "affiliate":
                extra_excl = "AND LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) NOT IN ('391/INV/AMG-ANR/VIII/25')"

            return f"""
                WITH RawData AS (
                    SELECT
                        CASE 
                            WHEN sih.NoBukti LIKE '%/XII/%' OR sih.NoBukti LIKE '%-XII-%' THEN 12
                            WHEN sih.NoBukti LIKE '%/XI/%'  OR sih.NoBukti LIKE '%-XI-%'  THEN 11
                            WHEN sih.NoBukti LIKE '%/X/%'   OR sih.NoBukti LIKE '%-X-%'   THEN 10
                            WHEN sih.NoBukti LIKE '%/IX/%'  OR sih.NoBukti LIKE '%-IX-%'  THEN 9
                            WHEN sih.NoBukti LIKE '%/VIII/%' OR sih.NoBukti LIKE '%-VIII-%' THEN 8
                            WHEN sih.NoBukti LIKE '%/VII/%' OR sih.NoBukti LIKE '%-VII-%' THEN 7
                            WHEN sih.NoBukti LIKE '%/VI/%'  OR sih.NoBukti LIKE '%-VI-%'  THEN 6
                            WHEN sih.NoBukti LIKE '%/V/%'   OR sih.NoBukti LIKE '%-V-%'   THEN 5
                            WHEN sih.NoBukti LIKE '%/IV/%'  OR sih.NoBukti LIKE '%-IV-%'  THEN 4
                            WHEN sih.NoBukti LIKE '%/III/%' OR sih.NoBukti LIKE '%-III-%' THEN 3
                            WHEN sih.NoBukti LIKE '%/II/%'  OR sih.NoBukti LIKE '%-II-%'  THEN 2
                            WHEN sih.NoBukti LIKE '%/I/%'   OR sih.NoBukti LIKE '%-I-%'   THEN 1
                            ELSE MONTH(sih.TglFaktur)
                        END AS Bln,
                        sii.Qty,
                        COALESCE(NULLIF(sii.HargaNet, 0), (((sii.HargaJual * (1.0 - ISNULL(sii.ItemDisPsn, 0)/100.0)) - ISNULL(sii.ItemDisc, 0)) * (1.0 - ISNULL(sii.ItemDisPsn2, 0)/100.0) - ISNULL(sii.ItemDisc2, 0)) * (1.0 - ISNULL(sii.ItemDisPsn3, 0)/100.0) - ISNULL(sii.ItemDisc3, 0)) AS BaseHargaNet,
                        CASE WHEN sii.IsPpn = 1 AND sih.TypePpn = 'I' THEN 1.0 + ISNULL(sih.PpnPersen, 11.0) / 100.0 ELSE 1.0 END AS PpnDivider,
                        ISNULL(sih.ExtDisc, 0) AS HeaderExtDisc,
                        sii.SalesInvoiceItemId,
                        LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice
                    FROM [{self.db_name}].[dbo].[SalesInvoiceItems] sii
                    INNER JOIN [{self.db_name}].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
                    LEFT JOIN [{self.db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                    WHERE sih.TglFaktur >= '2025-01-01' AND sih.TglFaktur < '2026-01-01'
                      {aff_clause}
                      {extra_excl}
                ),
                NetCalc AS (
                    SELECT *, (Qty * BaseHargaNet / PpnDivider) AS LineSubtotal, SUM(Qty * BaseHargaNet / PpnDivider) OVER (PARTITION BY NoInvoice) AS InvSubtotal
                    FROM RawData
                ),
                FinalP AS (
                    SELECT *, CASE WHEN InvSubtotal > 0 THEN (BaseHargaNet / PpnDivider) - (((Qty * BaseHargaNet / PpnDivider) / InvSubtotal) * HeaderExtDisc / NULLIF(Qty, 0)) ELSE (BaseHargaNet / PpnDivider) END AS HargaNet
                    FROM NetCalc
                ),
                Ranked AS (
                    SELECT *, ROW_NUMBER() OVER (PARTITION BY SalesInvoiceItemId, NoInvoice ORDER BY SalesInvoiceItemId) AS rn FROM FinalP
                )
                SELECT Bln, ROUND(SUM(Qty * HargaNet), 2) AS MonthlyOmzet 
                FROM Ranked 
                WHERE rn = 1 AND Bln IN ({months_str})
                GROUP BY Bln
                ORDER BY Bln
            """

        else:
            # 2024 Financial Model (With Typo Mapping, Roman Numeral Periode, and Net Deduplication)
            period_expr = self.build_period_expression("sih.NoBukti", "sih.TglFaktur")
            return f"""
                WITH RawCombinedData AS (
                    SELECT
                        'AMG' AS [PT], 2024 AS TahunDb,
                        CASE 
                            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('017/INV/AMG-WNL/I/24', '017/INV/AMG-WNL/I/245') THEN '017/INV/AMG-WNL/I/24'
                            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('128/INV/AMG-DSU/III/24', '128/INV/AMG-DSU/IV/24') THEN '128/INV/AMG-DSU/III/24'
                            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('187/INV/AMG-KAP/V/24', '187/INV/AMG-KAP/V/24018') THEN '187/INV/AMG-KAP/V/24'
                            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('295/INV/AMG-BJB/IX/24', '295/INV/AMG-BJP/IX/24') THEN '295/INV/AMG-BJB/IX/24'
                            WHEN LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) IN ('163/INV-AMG/MAPA/IV/2024', '163/INV/AMG-MAPA/IV/24') THEN '163/INV-AMG/MAPA/IV/2024'
                            ELSE LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', '')))
                        END AS NoInvoice, 
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
                    WHERE sih.TglFaktur >= '2024-01-01' AND sih.TglFaktur < '2025-01-01'
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

    def build_live_affiliate_query(self, year: int, months: List[int]) -> str:
        """Excludes non-commercial transactions from live affiliate breakdown."""
        date_cond = self.build_date_condition(year)
        months_str = ", ".join(str(m) for m in months)
        from app.core.config import settings
        aff_filter_clauses = [f"c.NamaLgn LIKE '%{company}%'" for company in settings.AFFILIATED_COMPANIES]
        aff_where_str = " OR ".join(aff_filter_clauses)

        exclusion_clause = ""
        if year == 2025:
            exclusion_clause = "AND LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) NOT IN ('391/INV/AMG-ANR/VIII/25')"
        elif year == 2026:
            exclusion_clause = """AND LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) NOT IN (
                '421.1/INV/AMG-ANR/VIII/26', '421.2/INV/AMG-ANR/VIII/26',
                '436/INV/AMG-BLS/IX/26(PPN KELUARAN)', '376/INV/AMG-MAR/VIII/26(1)',
                '387/INV/AMG-ASL/VIII/26 (1)', '236/INV/AMG-GH/V/26(1)'
            )"""

        return f"""
            SELECT 
                CASE 
                    WHEN c.NamaLgn LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
                    WHEN c.NamaLgn LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
                    WHEN c.NamaLgn LIKE '%Agri Prime International%' THEN 'API'
                    WHEN c.NamaLgn LIKE '%Mycotech Agro Asia%' THEN 'MAA'
                    WHEN c.NamaLgn LIKE '%Sarana Agro Panata%' THEN 'SAP'
                    WHEN c.NamaLgn LIKE '%Sarana Benih Panata%' THEN 'SBP'
                    WHEN c.NamaLgn LIKE '%Talenta Tiga Muda%' THEN 'TTM'
                    ELSE 'OTH'
                END AS CounterpartyCode,
                ROUND(SUM(sii.Qty * sii.HargaJual), 2) AS TotalOmzet
            FROM [{self.db_name}].[dbo].[SalesInvoiceHeaders] sih
            JOIN [{self.db_name}].[dbo].[SalesInvoiceItems] sii ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
            LEFT JOIN [{self.db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
            WHERE {date_cond}
              AND MONTH(sih.TglFaktur) IN ({months_str})
              AND ({aff_where_str})
              {exclusion_clause}
            GROUP BY 
                CASE 
                    WHEN c.NamaLgn LIKE '%Agrochem Mega Globalindo%' THEN 'AMG'
                    WHEN c.NamaLgn LIKE '%Agrofarm Nusa Raya%' THEN 'ANR'
                    WHEN c.NamaLgn LIKE '%Agri Prime International%' THEN 'API'
                    WHEN c.NamaLgn LIKE '%Mycotech Agro Asia%' THEN 'MAA'
                    WHEN c.NamaLgn LIKE '%Sarana Agro Panata%' THEN 'SAP'
                    WHEN c.NamaLgn LIKE '%Sarana Benih Panata%' THEN 'SBP'
                    WHEN c.NamaLgn LIKE '%Talenta Tiga Muda%' THEN 'TTM'
                    ELSE 'OTH'
                END
        """

