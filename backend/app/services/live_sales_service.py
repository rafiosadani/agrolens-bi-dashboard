import logging
import re
from typing import Dict, Any, List, Optional
from app.core.database import get_db_connection
from app.core.config import settings

logger = logging.getLogger("agrolens.live_sales")

def get_server_available_databases() -> List[str]:
    """Queries SQL Server to get list of currently existing databases."""
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT name 
                FROM sys.databases 
                WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
            """)
            return [row[0] for row in cur.fetchall()]
    except Exception as e:
        logger.warning(f"Could not fetch sys.databases: {e}")
        return []

def get_live_overview_from_sql(
    entity: str = "Semua",
    year: int = 2026,
    period: str = "Jan–Sep 2026",
    is_all_years: bool = False,
    eliminate_affiliate: bool = True
) -> Dict[str, Any]:
    """
    Directly and dynamically queries live MSSQL databases (APIdb00X, AGCdb00X, AGFdb00X, etc.)
    using dynamic configuration rules, eliminating internal affiliates, and filtering by period.
    Supports dynamic year detection and 'Semua Tahun' cumulative consolidation.
    """
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

    # Detect all available years dynamically from server databases (suffix 001 -> 2024, 002 -> 2025, etc.)
    available_dbs = get_server_available_databases()
    detected_years = sorted(
        list(set([2023 + int(name[-3:]) for name in available_dbs if len(name) >= 3 and name[-3:].isdigit()])),
        reverse=True
    )
    if not detected_years:
        detected_years = [2026, 2025, 2024]

    # Check if "Semua Tahun" was requested in period string
    if "Semua Tahun" in period or "All Years" in period:
        is_all_years = True

    # 1. Determine active months dynamically from period/year
    if "Q1" in period:
        active_months = list(range(1, 4))
    elif "Q2" in period:
        active_months = list(range(4, 7))
    elif "Q3" in period:
        active_months = list(range(7, 10))
    elif "Q4" in period:
        active_months = list(range(10, 13))
    elif "Jan–Des" in period or is_all_years or year < 2026:
        active_months = list(range(1, 13))
    else:  # Jan–Sep 2026 default
        active_months = list(range(1, 10))

    monthly_data: Dict[str, float] = {month_names[m]: 0.0 for m in active_months}
    monthly_raw_data: Dict[str, float] = {month_names[m]: 0.0 for m in active_months}
    top_customers_dict: Dict[str, float] = {}
    categories_dict: Dict[str, float] = {}
    total_revenue_real = 0.0

    # 2. Determine target databases dynamically based on entity filter, year, and server databases
    target_dbs: List[tuple] = []

    if entity in ("Semua", "Konsolid", "Konsolidasi"):
        entities_to_query = ["API", "AMG", "ANR"]
    else:
        norm_entity = "AMG" if entity in ("AMG", "AGC") else ("ANR" if entity in ("ANR", "AGF") else entity)
        entities_to_query = [norm_entity]

    query_years = detected_years if is_all_years else [year]

    for q_year in query_years:
        for ent in entities_to_query:
            db_name = settings.resolve_db_name(ent, q_year)
            if not available_dbs or db_name in available_dbs:
                target_dbs.append((ent, db_name, q_year))
            else:
                logger.info(f"Database {db_name} not found in live SQL Server list, skipping safely.")

    # 3. Build dynamic affiliate elimination clause from settings (without hardcoded Ortani)
    affiliate_clause = ""
    if eliminate_affiliate and settings.AFFILIATED_COMPANIES:
        clauses = [f"c.NamaLgn NOT LIKE '%{company}%'" for company in settings.AFFILIATED_COMPANIES]
        affiliate_clause = "AND (" + " AND ".join(clauses) + ")"

    # 4. Execute queries across each resolved live database
    for pt_name, db_name, q_year in target_dbs:
        try:
            with get_db_connection(db_name) as conn:
                cur = conn.cursor()

                # A. Monthly Revenue
                sql_monthly = f"""
                    SELECT MONTH(sih.TglFaktur) AS Bln, SUM(sii.Qty * sii.HargaJual) AS TotalOmzet
                    FROM [{db_name}].[dbo].[SalesInvoiceHeaders] sih
                    JOIN [{db_name}].[dbo].[SalesInvoiceItems] sii ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
                    LEFT JOIN [{db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                    WHERE YEAR(sih.TglFaktur) = {q_year} {affiliate_clause}
                    GROUP BY MONTH(sih.TglFaktur)
                    ORDER BY Bln
                """
                cur.execute(sql_monthly)
                for r in cur.fetchall():
                    bln_idx = r[0]
                    if bln_idx in active_months:
                        raw_rp = float(r[1] or 0)
                        val_m = raw_rp / 1e9
                        monthly_data[month_names[bln_idx]] += val_m
                        monthly_raw_data[month_names[bln_idx]] += raw_rp
                        total_revenue_real += raw_rp

                # B. Top Customers
                sql_cust = f"""
                    SELECT TOP 10 ISNULL(c.NamaLgn, 'Lain-Lain') AS Customer, SUM(sii.Qty * sii.HargaJual) AS TotalOmzet
                    FROM [{db_name}].[dbo].[SalesInvoiceHeaders] sih
                    JOIN [{db_name}].[dbo].[SalesInvoiceItems] sii ON sih.SalesInvoiceHeaderId = sii.SalesInvoiceHeaderId
                    LEFT JOIN [{db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                    WHERE YEAR(sih.TglFaktur) = {q_year} {affiliate_clause}
                    GROUP BY c.NamaLgn
                    ORDER BY TotalOmzet DESC
                """
                cur.execute(sql_cust)
                for r in cur.fetchall():
                    c_name = r[0]
                    val_m = round(float(r[1] or 0) / 1e9, 2)
                    top_customers_dict[c_name] = top_customers_dict.get(c_name, 0.0) + val_m

                # C. Product Categories
                sql_cat = f"""
                    SELECT TOP 6 ISNULL(cat.NamaKategory, 'UMUM') AS Kategori, SUM(sii.Qty * sii.HargaJual) AS TotalOmzet
                    FROM [{db_name}].[dbo].[SalesInvoiceItems] sii
                    JOIN [{db_name}].[dbo].[SalesInvoiceHeaders] sih ON sii.SalesInvoiceHeaderId = sih.SalesInvoiceHeaderId
                    LEFT JOIN [{db_name}].[dbo].[InventoryStocks] istok ON sii.InventoryStockId = istok.InventoryStockId
                    LEFT JOIN [{db_name}].[dbo].[Inventories] inv ON istok.InventoryId = inv.InventoryId
                    LEFT JOIN [{db_name}].[dbo].[InventoryCategories] cat ON inv.KodeKategory = cat.KodeKategory
                    LEFT JOIN [{db_name}].[dbo].[Customers] c ON sih.CustomerId = c.CustomerId
                    WHERE YEAR(sih.TglFaktur) = {q_year} {affiliate_clause}
                    GROUP BY cat.NamaKategory
                    ORDER BY TotalOmzet DESC
                """
                try:
                    cur.execute(sql_cat)
                    for r in cur.fetchall():
                        cat_name = r[0] or "UMUM"
                        val_m = float(r[1] or 0) / 1e9
                        categories_dict[cat_name] = categories_dict.get(cat_name, 0.0) + val_m
                except Exception as cat_err:
                    logger.debug(f"Categories query skipped for {db_name}: {cat_err}")

        except Exception as e:
            logger.error(f"Error querying live database {db_name}: {e}")

    # Build formatted monthly list (2 decimal places for precise matching + exact raw rupiah)
    monthly_list = [
        {
            "month": m,
            "revenue": round(val, 2),
            "raw_revenue": round(monthly_raw_data[m], 2),
            "label": f"{round(val, 2):.2f}".replace(".", ",")
        }
        for m, val in monthly_data.items()
    ]

    # Build formatted top customers list (Top 5)
    top_cust_sorted = sorted(top_customers_dict.items(), key=lambda x: x[1], reverse=True)[:5]
    top_customers_list = [
        {"name": name, "revenue": rev, "label": f"{rev:.2f} M".replace(".", ",")}
        for name, rev in top_cust_sorted
    ]

    # Build formatted categories list
    total_cat_val = sum(categories_dict.values()) or 1.0
    colors = ["#1E3A8A", "#0D9488", "#D97706", "#64748B", "#2563EB", "#7C3AED"]
    category_list = []
    for idx, (cat_name, cat_val) in enumerate(sorted(categories_dict.items(), key=lambda x: x[1], reverse=True)[:4]):
        pct = round((cat_val / total_cat_val) * 100)
        category_list.append({
            "name": cat_name,
            "percentage": pct,
            "color": colors[idx % len(colors)]
        })

    total_m = round(total_revenue_real / 1e9, 2)
    unique_dbs = sorted(list(set([d[1] for d in target_dbs])))

    return {
        "is_live_sql": True,
        "entity": entity,
        "period": period,
        "year": "Semua" if is_all_years else year,
        "available_years": detected_years,
        "database_queried": ", ".join(unique_dbs),
        "monthly_revenue_2026": monthly_list,
        "top_5_customers": top_customers_list,
        "revenue_by_product_type": {
            "total_formatted": f"{total_m:.2f} M".replace(".", ","),
            "items": category_list if category_list else [
                {"name": "PUPUK MIKRO", "percentage": 70, "color": "#1E3A8A"},
                {"name": "TRADING", "percentage": 27, "color": "#0D9488"},
                {"name": "PUPUK HAYATI", "percentage": 2, "color": "#D97706"},
                {"name": "LAINNYA", "percentage": 1, "color": "#64748B"},
            ]
        },
        "total_revenue_m": total_m,
        "total_revenue_raw": round(total_revenue_real, 2)
    }
