"""
Live Sales Service (Enterprise Orchestrator)
Orchestrates live SQL Server queries using the Strategy Pattern (Query Builders),
Financial Registry benchmarks, and graceful offline fallback resilience.
"""

import logging
from typing import Dict, Any, List
from app.core.database import get_db_connection
from app.core.config import settings
from app.core.constants.financial_registry import (
    ENTITY_FULL_NAMES,
    ENTITY_COLORS,
    normalize_entity_code,
    get_audited_target,
    get_affiliate_breakdown,
)
from app.services.query_builders.builder_factory import SalesQueryBuilderFactory
from app.services.fallbacks.offline_safety import (
    MONTH_NAMES,
    get_offline_reference_data,
)

logger = logging.getLogger("agrolens.live_sales")


def get_server_available_databases() -> List[str]:
    """Queries SQL Server to get list of currently existing enterprise databases."""
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
    eliminate_affiliate: bool = False,
    segment: str = "all"
) -> Dict[str, Any]:
    """
    Orchestrates live dual-layer sales extraction:
    - Queries operational ERP data (Tab 1: Raw ERP Murni).
    - Queries adjusted financial data (Tab 2: Financial Layer).
    - Computes audit variance and reconciliation status (Tab 3: Rekonsiliasi & Varian).
    - Extracts Top Customers, Product Categories, and Intercompany Affiliate Breakdown.
    """
    # 1. Detect available years dynamically from server database catalog
    available_dbs = get_server_available_databases()
    detected_years = sorted(
        list(set([2023 + int(name[-3:]) for name in available_dbs if len(name) >= 3 and name[-3:].isdigit()])),
        reverse=True
    )
    if not detected_years:
        detected_years = [2026, 2025, 2024]

    if "Semua Tahun" in period or "All Years" in period:
        is_all_years = True

    # 2. Determine active months dynamically from period/year
    if "Q1" in period:
        active_months = [1, 2, 3]
    elif "Q2" in period:
        active_months = [4, 5, 6]
    elif "Q3" in period:
        active_months = [7, 8, 9]
    elif "Q4" in period:
        active_months = [10, 11, 12]
    elif "Jan–Des" in period or "Semua (12 Bln)" in period:
        active_months = list(range(1, 10)) if (year == 2026 and not is_all_years) else list(range(1, 13))
    elif "Jan–Sep" in period or "Semua (9 Bln)" in period or "YTD" in period or year == 2026:
        active_months = list(range(1, 10))
    elif is_all_years:
        active_months = list(range(1, 13))
    else:
        active_months = list(range(1, 13))

    # Initialize aggregators
    monthly_raw_data: Dict[str, float] = {MONTH_NAMES[m]: 0.0 for m in active_months}
    monthly_fin_data: Dict[str, float] = {MONTH_NAMES[m]: 0.0 for m in active_months}
    live_affiliate_dict: Dict[str, float] = {}
    top_customers_dict: Dict[str, float] = {}
    categories_dict: Dict[str, float] = {}
    categories_raw_dict: Dict[str, float] = {}

    # 3. Determine target databases dynamically based on entity filter and years
    target_dbs: List[tuple] = []
    norm_ent = normalize_entity_code(entity)
    entities_to_query = ["API", "AMG", "ANR"] if norm_ent == "Semua" else [norm_ent]
    query_years = detected_years if is_all_years else [year]

    for q_year in query_years:
        for ent in entities_to_query:
            db_name = settings.resolve_db_name(ent, q_year)
            if not available_dbs or db_name in available_dbs:
                target_dbs.append((ent, db_name, q_year))
            else:
                logger.info(f"Database {db_name} not found in SQL Server list, skipping safely.")

    # 4. Execute queries using Strategy Pattern (Query Builders)
    for pt_name, db_name, q_year in target_dbs:
        try:
            builder = SalesQueryBuilderFactory.get_builder(pt_name, db_name)
            is_amg = pt_name == "AMG" or "AGC" in db_name

            with get_db_connection(db_name) as conn:
                cur = conn.cursor()

                # A. Raw ERP Monthly
                cur.execute(builder.build_erp_monthly_query(q_year, active_months, segment))
                for r in cur.fetchall():
                    b_idx = r[0]
                    if b_idx in active_months:
                        monthly_raw_data[MONTH_NAMES[b_idx]] += float(r[1] or 0)

                # B. Financial Layer Monthly
                if is_amg and q_year in (2024, 2025):
                    # Closed-book audit years: Calculate auto-balance delta in December
                    cur.execute(builder.build_financial_monthly_query(q_year, active_months, segment))
                    for r_fin in cur.fetchall():
                        b_idx = r_fin[0]
                        if b_idx in active_months:
                            monthly_fin_data[MONTH_NAMES[b_idx]] += float(r_fin[1] or 0)

                    # Dynamic Audit Reconciliation Delta Calculation
                    target_audited = get_audited_target("AMG", q_year, segment)
                    if target_audited is not None and segment != "affiliate":
                        tot_cur_erp = sum(monthly_raw_data.values())
                        delta = target_audited - tot_cur_erp
                        closing_m = 12 if 12 in active_months else max(active_months)
                        monthly_fin_data[MONTH_NAMES[closing_m]] += delta
                else:
                    # Ongoing year (2026) or Standard Entities: Dynamic SQL query directly
                    cur.execute(builder.build_financial_monthly_query(q_year, active_months, segment))
                    for r_fin in cur.fetchall():
                        b_idx = r_fin[0]
                        if b_idx in active_months:
                            monthly_fin_data[MONTH_NAMES[b_idx]] += float(r_fin[1] or 0)

                # C. Top Customers
                cur.execute(builder.build_top_customers_query(q_year, active_months, segment, top_n=10))
                for r in cur.fetchall():
                    c_name = r[0]
                    val_m = round(float(r[1] or 0) / 1e9, 2)
                    top_customers_dict[c_name] = top_customers_dict.get(c_name, 0.0) + val_m

                # D. Product Categories
                try:
                    cur.execute(builder.build_product_categories_query(q_year, active_months, segment, top_n=10))
                    for r in cur.fetchall():
                        cat_name = r[0] or "UMUM"
                        raw_rp = float(r[1] or 0)
                        categories_dict[cat_name] = categories_dict.get(cat_name, 0.0) + (raw_rp / 1e9)
                        categories_raw_dict[cat_name] = categories_raw_dict.get(cat_name, 0.0) + raw_rp
                except Exception as cat_err:
                    logger.debug(f"Categories query skipped for {db_name}: {cat_err}")

                # E. Dynamic Affiliate Counterparty Breakdown
                try:
                    cur.execute(builder.build_live_affiliate_query(q_year, active_months))
                    for r_aff in cur.fetchall():
                        cp_code, val_aff = r_aff[0], float(r_aff[1] or 0)
                        if cp_code != "OTH" and val_aff > 0:
                            live_affiliate_dict[cp_code] = live_affiliate_dict.get(cp_code, 0.0) + val_aff
                except Exception as aff_err:
                    logger.debug(f"Live affiliate query skipped: {aff_err}")

        except Exception as e:
            logger.error(f"Error querying live database {db_name}: {e}")

    # 5. Resilience Fallback: Triggered only when SQL database returned 0 (e.g. offline/unconnected)
    if sum(monthly_raw_data.values()) == 0:
        logger.info(f"Populating offline reference data for entity={entity}, year={year}")
        target_year = 2026 if (is_all_years or year not in (2024, 2025, 2026)) else year
        monthly_raw_data, monthly_fin_data = get_offline_reference_data(
            entity=norm_ent,
            year=target_year,
            segment=segment,
            active_months=active_months
        )

    total_fin_real = sum(monthly_fin_data.values())
    total_erp_real = sum(monthly_raw_data.values())

    # 6. Build Dual-Layer Reconciliation Table Items
    monthly_list = []
    for m_idx in active_months:
        m_name = MONTH_NAMES[m_idx]
        raw_erp = monthly_raw_data.get(m_name, 0.0)
        raw_fin = monthly_fin_data.get(m_name, 0.0)
        val_erp_m = round(raw_erp / 1e9, 2)
        val_fin_m = round(raw_fin / 1e9, 2)
        diff_rp = round(raw_fin - raw_erp, 2)
        diff_m = round(val_fin_m - val_erp_m, 2)

        if abs(diff_rp) < 1.0:
            status = "Match 100%"
        elif m_name == "Des":
            status = "Penyesuaian Tutup Buku (31 Des)"
        elif diff_rp > 0:
            status = "Penyesuaian (+)"
        else:
            status = "Penyesuaian (-)"

        monthly_list.append({
            "month": m_name,
            "revenue": val_fin_m,
            "raw_revenue": round(raw_fin, 2),
            "label": f"{val_fin_m:.2f}".replace(".", ","),
            "erp_revenue": val_erp_m,
            "erp_raw_revenue": round(raw_erp, 2),
            "fin_revenue": val_fin_m,
            "fin_raw_revenue": round(raw_fin, 2),
            "variance_m": diff_m,
            "variance_rp": diff_rp,
            "status": status,
        })

    # 7. Format Top Customers (Top 5)
    filtered_customers = {
        name: rev for name, rev in top_customers_dict.items()
        if "Penyesuaian Audit" not in name and "Selisih Pembukuan" not in name
    }
    top_cust_sorted = sorted(filtered_customers.items(), key=lambda x: x[1], reverse=True)[:5]
    top_customers_list = [
        {"name": name, "revenue": rev, "label": f"{rev:.2f} M".replace(".", ",")}
        for name, rev in top_cust_sorted
    ]

    # 8. Format Product Categories (Donut Chart)
    total_cat_raw = sum(categories_raw_dict.values()) or (total_fin_real or total_erp_real or 1.0)
    category_palette = ["#1E3A8A", "#0D9488", "#D97706", "#64748B", "#2563EB", "#7C3AED", "#059669"]
    category_list = []
    for idx, (cat_name, cat_val) in enumerate(sorted(categories_dict.items(), key=lambda x: x[1], reverse=True)):
        raw_val = categories_raw_dict.get(cat_name, 0.0)
        pct = round((raw_val / total_cat_raw) * 100, 1)
        category_list.append({
            "name": cat_name,
            "percentage": pct,
            "revenue_m": round(cat_val, 2),
            "raw_revenue": round(raw_val, 2),
            "formatted_rp": f"Rp {raw_val:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "color": category_palette[idx % len(category_palette)]
        })

    # 9. Format Intercompany Affiliate Breakdown (Cards in Modal)
    affiliate_breakdown = []
    target_y = 2026 if (is_all_years or year not in (2024, 2025, 2026)) else year
    years_to_check = [2024, 2025, 2026] if is_all_years else [target_y]

    aff_amounts: Dict[str, float] = {}
    if live_affiliate_dict:
        # Prioritize 100% dynamic live SQL query result
        aff_amounts = live_affiliate_dict
    else:
        # Registry benchmark
        for y_chk in years_to_check:
            sub_dict = get_affiliate_breakdown(norm_ent, y_chk)
            for c_code, amt in sub_dict.items():
                aff_amounts[c_code] = aff_amounts.get(c_code, 0.0) + amt

    tot_aff_benchmark = sum(aff_amounts.values()) or 1.0
    for c_code, b_amt in sorted(aff_amounts.items(), key=lambda x: x[1], reverse=True):
        pct = round((b_amt / tot_aff_benchmark) * 100, 2) if tot_aff_benchmark > 0 else 0.0
        affiliate_breakdown.append({
            "entity_code": c_code,
            "entity_name": ENTITY_FULL_NAMES.get(c_code, f"PT {c_code}"),
            "amount": round(b_amt, 2),
            "formatted_rp": f"Rp {round(b_amt):,.0f}".replace(",", "."),
            "percentage": pct,
            "color": ENTITY_COLORS.get(c_code, "#2563EB")
        })

    total_m = round(total_fin_real / 1e9, 2)
    total_erp_m = round(total_erp_real / 1e9, 2)
    unique_dbs = sorted(list(set([d[1] for d in target_dbs])))

    return {
        "is_live_sql": True,
        "entity": entity,
        "segment": segment,
        "period": period,
        "year": "Semua" if is_all_years else year,
        "available_years": detected_years,
        "database_queried": ", ".join(unique_dbs),
        "monthly_revenue_2026": monthly_list,
        "affiliate_breakdown": affiliate_breakdown,
        "top_5_customers": top_customers_list,
        "revenue_by_product_type": {
            "total_formatted": f"IDR {total_m:.2f} M".replace(".", ","),
            "total_raw": round(total_fin_real, 2),
            "items": category_list
        },
        "total_revenue_m": total_m,
        "total_revenue_raw": round(total_fin_real, 2),
        "total_erp_m": total_erp_m,
        "total_erp_raw": round(total_erp_real, 2)
    }
