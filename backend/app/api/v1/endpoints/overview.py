import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query
from app.services.live_sales_service import get_live_overview_from_sql

router = APIRouter(prefix="/overview")
logger = logging.getLogger("agrolens.overview")

@router.get("/summary")
def get_overview_summary(
    entity: str = Query("Semua", description="Filter entitas bisnis (Semua, API, AGC, ANR)"),
    periode: Optional[str] = Query(None, description="Filter periode laporan (Indonesian)"),
    period: Optional[str] = Query(None, description="Filter period reports (English)"),
    source: str = Query("live_sql", description="Data source: 'live_sql' (Direct MSSQL) or 'consolidated' (Excel RKAP)")
) -> Dict[str, Any]:
    periode = periode or period or "Jan–Sep 2026"
    """
    Overview / Ringkasan Data Mart:
    Fetches real-time transaction aggregations directly from SQL Server (APIdb003, AGCdb003, AGFdb003)
    combined with RKAP targets and competitor benchmarks.
    """
    # 1. Base Managerial & Competitor Benchmark Targets
    base_kpis = {
        "target_rkap": {
            "label": "Target RKAP 2026",
            "value_formatted": "IDR 632 M",
            "value_raw": 631981970171,
            "badge_label": "Acuan pencapaian revenue",
            "badge_variant": "neutral"
        },
        "est_revenue_po": {
            "label": "Est. capaian revenue (PO)",
            "value_formatted": "IDR 503,82 M",
            "value_raw": 503820000000,
            "badge_label": "79,73% dari target · YTD + Outstanding",
            "badge_variant": "success"
        },
        "ytd_real_revenue": {
            "label": "Capaian revenue YTD real",
            "value_formatted": "IDR 400,92 M",
            "value_raw": 400929809822,
            "badge_label": "63,44% dari target · ▲ 28,54% YoY",
            "badge_variant": "success"
        },
        "kesesuaian_rkap": {
            "label": "% Kesesuaian RKAP",
            "value_formatted": "53,75%",
            "value_raw": 53.75,
            "badge_label": "34,10% terhadap target IDR 632 M",
            "badge_variant": "neutral"
        }
    }

    competitor_position = [
        {"metric": "GPM", "company": 21.98, "benchmark": 24.02},
        {"metric": "EBITDA", "company": 13.15, "benchmark": 8.96},
        {"metric": "OPM", "company": 12.27, "benchmark": 8.27},
        {"metric": "NPM", "company": 7.73, "benchmark": 6.88}
    ]

    # Default consolidated/fallback data
    monthly_revenue = [
        {"month": "Jan", "revenue": 32.5, "label": "32,5"},
        {"month": "Feb", "revenue": 36.8, "label": "36,8"},
        {"month": "Mar", "revenue": 41.2, "label": "41,2"},
        {"month": "Apr", "revenue": 43.9, "label": "43,9"},
        {"month": "Mei", "revenue": 45.6, "label": "45,6"},
        {"month": "Jun", "revenue": 47.3, "label": "47,3"},
        {"month": "Jul", "revenue": 50.1, "label": "50,1"},
        {"month": "Agu", "revenue": 52.4, "label": "52,4"},
        {"month": "Sep", "revenue": 51.12, "label": "51,12"}
    ]

    revenue_by_jenis = {
        "total_formatted": "400,9 M",
        "items": [
            {"name": "PUPUK MIKRO", "percentage": 41, "color": "#1E3A8A"},
            {"name": "TRADING", "percentage": 27, "color": "#0D9488"},
            {"name": "PUPUK HAYATI", "percentage": 19, "color": "#D97706"},
            {"name": "LAINNYA", "percentage": 13, "color": "#64748B"}
        ]
    }

    top_customers = [
        {"name": "Customer A", "revenue": 62.4, "label": "62,4 M"},
        {"name": "Customer B", "revenue": 48.7, "label": "48,7 M"},
        {"name": "Customer C", "revenue": 39.2, "label": "39,2 M"},
        {"name": "Customer D", "revenue": 31.5, "label": "31,5 M"},
        {"name": "Customer E", "revenue": 27.8, "label": "27,8 M"}
    ]

    is_live = False
    db_queried = None
    available_years = [2026, 2025, 2024]

    # Check if "Semua Tahun" is requested or extract target year
    is_all_years = "Semua Tahun" in periode or "All Years" in periode
    target_year = 2026
    if not is_all_years:
        for y in [2024, 2025, 2026, 2027, 2028, 2029]:
            if str(y) in periode:
                target_year = y
                break

    # If live_sql is requested (default), query SQL Server directly!
    if source == "live_sql":
        try:
            live_res = get_live_overview_from_sql(
                entity=entity,
                year=target_year,
                period=periode,
                is_all_years=is_all_years,
                eliminate_affiliate=True
            )
            if live_res.get("monthly_revenue_2026"):
                monthly_revenue = live_res["monthly_revenue_2026"]
            if live_res.get("top_5_customers"):
                top_customers = live_res["top_5_customers"]
            if live_res.get("revenue_by_product_type"):
                revenue_by_jenis = live_res["revenue_by_product_type"]
            if live_res.get("available_years"):
                available_years = live_res["available_years"]
            if live_res.get("total_revenue_raw"):
                total_raw = live_res["total_revenue_raw"]
                total_m = live_res.get("total_revenue_m", total_raw / 1e9)
                target_raw = base_kpis["target_rkap"]["value_raw"] or 631981970171
                pct_rkap = (total_raw / target_raw) * 100

                year_label = "Semua Tahun" if is_all_years else str(target_year)
                base_kpis["target_rkap"]["label"] = f"Target RKAP {year_label}"
                base_kpis["ytd_real_revenue"]["label"] = f"Capaian revenue ({year_label}) real"
                base_kpis["ytd_real_revenue"]["value_formatted"] = f"IDR {total_m:.2f} M".replace(".", ",")
                base_kpis["ytd_real_revenue"]["value_raw"] = total_raw
                base_kpis["ytd_real_revenue"]["badge_label"] = f"{pct_rkap:.2f}% dari target RKAP".replace(".", ",")

                base_kpis["kesesuaian_rkap"]["value_formatted"] = f"{pct_rkap:.2f}%".replace(".", ",")
                base_kpis["kesesuaian_rkap"]["value_raw"] = round(pct_rkap, 2)
                base_kpis["kesesuaian_rkap"]["badge_label"] = f"{pct_rkap:.2f}% terhadap target RKAP".replace(".", ",")

            is_live = True
            db_queried = live_res.get("database_queried")
        except Exception as err:
            logger.warning(f"Could not fetch live SQL: {err}, falling back to consolidated.")

    return {
        "period": periode,
        "entity": entity,
        "source": source,
        "is_live_sql": is_live,
        "database_queried": db_queried,
        "available_years": available_years,
        "kpis": base_kpis,
        "monthly_revenue_2026": monthly_revenue,
        "revenue_by_product_type": revenue_by_jenis,
        "competitor_position": competitor_position,
        "top_5_customers": top_customers
    }
