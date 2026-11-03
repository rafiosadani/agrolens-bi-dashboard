"""
Base Sales Query Builder (Abstract Strategy)
Defines standard SQL CTE generation contract for MSSQL ERP databases.
"""

from abc import ABC, abstractmethod
from typing import List
from app.core.config import settings


class BaseSalesQueryBuilder(ABC):
    """
    Abstract Base Class for building dynamic SQL queries against ERP Sales databases.
    Implements standard SQL CTE algorithms: BaseHargaNet, PpnDivider, HeaderExtDisc, and ROW_NUMBER() dedup.
    """

    def __init__(self, entity_code: str, db_name: str):
        self.entity_code = entity_code
        self.db_name = db_name

    def build_date_condition(self, year: int) -> str:
        """Dynamic date boundary condition for the target year (inclusive of full 12 months across all entities)."""
        return f"sih.TglFaktur >= '{year}-01-01' AND sih.TglFaktur < '{year + 1}-01-01'"

    def build_period_expression(self, inv_col: str = "sih.NoBukti", date_col: str = "sih.TglFaktur") -> str:
        """
        Dynamically extracts accounting period (Roman numeral in No Bukti / Invoice)
        used by official corporate finance accounting. Falls back to MONTH(date_col).
        """
        return f"""CASE 
            WHEN {inv_col} LIKE '%/XII/%' OR {inv_col} LIKE '%-XII-%' THEN 12
            WHEN {inv_col} LIKE '%/XI/%'  OR {inv_col} LIKE '%-XI-%'  THEN 11
            WHEN {inv_col} LIKE '%/X/%'   OR {inv_col} LIKE '%-X-%'   THEN 10
            WHEN {inv_col} LIKE '%/IX/%'  OR {inv_col} LIKE '%-IX-%'  THEN 9
            WHEN {inv_col} LIKE '%/VIII/%' OR {inv_col} LIKE '%-VIII-%' THEN 8
            WHEN {inv_col} LIKE '%/VII/%' OR {inv_col} LIKE '%-VII-%' THEN 7
            WHEN {inv_col} LIKE '%/VI/%'  OR {inv_col} LIKE '%-VI-%'  THEN 6
            WHEN {inv_col} LIKE '%/V/%'   OR {inv_col} LIKE '%-V-%'   THEN 5
            WHEN {inv_col} LIKE '%/IV/%'  OR {inv_col} LIKE '%-IV-%'  THEN 4
            WHEN {inv_col} LIKE '%/III/%' OR {inv_col} LIKE '%-III-%' THEN 3
            WHEN {inv_col} LIKE '%/II/%'  OR {inv_col} LIKE '%-II-%'  THEN 2
            WHEN {inv_col} LIKE '%/I/%'   OR {inv_col} LIKE '%-I-%'   THEN 1
            ELSE MONTH({date_col})
        END"""

    def build_affiliate_clause(self, segment: str = "all") -> str:
        """Builds SQL WHERE clause for customer segment: 'all', 'oth', or 'affiliate'."""
        if not settings.AFFILIATED_COMPANIES:
            return ""
        
        seg = segment.lower().strip()
        if seg == "oth":
            clauses = [f"c.NamaLgn NOT LIKE '%{company}%'" for company in settings.AFFILIATED_COMPANIES]
            return "AND (" + " AND ".join(clauses) + ")"
        elif seg == "affiliate":
            clauses = [f"c.NamaLgn LIKE '%{company}%'" for company in settings.AFFILIATED_COMPANIES]
            return "AND (" + " OR ".join(clauses) + ")"
        return ""

    def build_erp_monthly_query(self, year: int, months: List[int], segment: str = "all") -> str:
        """
        Builds raw ERP query with standard net price calculation.
        Valid for Tab 1 (Data Riil ERP Murni).
        """
        date_cond = self.build_date_condition(year)
        aff_clause = self.build_affiliate_clause(segment)
        months_str = ", ".join(str(m) for m in months)

        return f"""
            WITH RawCombinedData AS (
                SELECT
                    '{self.entity_code}' AS [PT],
                    {year} AS TahunDb,
                    LTRIM(RTRIM(REPLACE(sih.NoBukti, '''', ''))) AS NoInvoice, 
                    CAST(sih.TglFaktur AS DATE) AS TglTrn,
                    MONTH(sih.TglFaktur) AS Bln,
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
                  AND MONTH(sih.TglFaktur) IN ({months_str})
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
            WHERE rn = 1
            GROUP BY Bln
            ORDER BY Bln
        """

    @abstractmethod
    def build_financial_monthly_query(self, year: int, months: List[int], segment: str = "all") -> str:
        """
        Builds the Financial Layer query. Entities may have custom return logic,
        non-commercial invoice exclusions, or adjustments.
        """
        pass

    def build_top_customers_query(self, year: int, months: List[int], segment: str = "all", top_n: int = 10) -> str:
        """Builds query for Top N Customers."""
        date_cond = self.build_date_condition(year)
        aff_clause = self.build_affiliate_clause(segment)
        months_str = ", ".join(str(m) for m in months)

        return f"""
            SELECT TOP {top_n} ISNULL(c.NamaLgn, 'Lain-Lain') AS Customer, SUM(sii.Qty * sii.HargaJual) AS TotalOmzet
            FROM [{self.db_name}].[dbo].[SalesInvoiceHeaders] sih
            JOIN [{self.db_name}].[dbo].[SalesInvoiceItems] sii ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
            LEFT JOIN [{self.db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
            WHERE {date_cond} 
              AND MONTH(sih.TglFaktur) IN ({months_str})
              {aff_clause}
            GROUP BY c.NamaLgn
            ORDER BY TotalOmzet DESC
        """

    def build_product_categories_query(self, year: int, months: List[int], segment: str = "all", top_n: int = 10) -> str:
        """Builds query for Product Categories (Donut Chart)."""
        date_cond = self.build_date_condition(year)
        aff_clause = self.build_affiliate_clause(segment)
        months_str = ", ".join(str(m) for m in months)

        return f"""
            SELECT TOP {top_n} ISNULL(cat.NamaKategory, 'UMUM') AS Kategori, SUM(sii.Qty * sii.HargaJual) AS TotalOmzet
            FROM [{self.db_name}].[dbo].[SalesInvoiceItems] sii
            JOIN [{self.db_name}].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
            LEFT JOIN [{self.db_name}].[dbo].[InventoryStocks] istok ON sii.InventoryStockId = istok.InventoryStockId
            LEFT JOIN [{self.db_name}].[dbo].[Inventories] inv ON istok.InventoryId = inv.InventoryId
            LEFT JOIN [{self.db_name}].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
            LEFT JOIN [{self.db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
            WHERE {date_cond} 
              AND MONTH(sih.TglFaktur) IN ({months_str})
              {aff_clause}
            GROUP BY cat.NamaKategory
            ORDER BY TotalOmzet DESC
        """

    def build_live_affiliate_query(self, year: int, months: List[int]) -> str:
        """Queries live affiliate sales broken down by counterparty."""
        date_cond = self.build_date_condition(year)
        months_str = ", ".join(str(m) for m in months)
        aff_filter_clauses = [f"c.NamaLgn LIKE '%{company}%'" for company in settings.AFFILIATED_COMPANIES]
        aff_where_str = " OR ".join(aff_filter_clauses)

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

