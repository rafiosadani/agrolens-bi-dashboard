from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Dict, Any
from app.services.amg_sales_service import (
    get_amg_sales_data,
    get_amg_reconciliation_summary,
    load_sql_query,
)

router = APIRouter(prefix="/sales/amg", tags=["PT AMG Sales (Dual-Layer ERP & Financial)"])

@router.get("/raw", summary="Tab 1: Data Penjualan Murni ERP PT AMG")
def get_raw_erp_sales(
    year: int = Query(2025, ge=2024, le=2026, description="Tahun transaksi (2024: AGCdb001, 2025: AGCdb002, 2026: AGCdb003)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter bulan (1-12)"),
    limit: int = Query(100, ge=1, le=1000, description="Maksimum baris data yang diambil"),
    offset: int = Query(0, ge=0, description="Offset paginasi"),
    search: Optional[str] = Query(None, description="Pencarian nama customer, no invoice, atau barang")
) -> Dict[str, Any]:
    """
    **Tab 1 - Raw ERP Layer:**
    Menampilkan data penjualan murni dari database ERP tanpa rekayasa atau penyesuaian auto-balance.
    Digunakan untuk operasional IT, pengecekan audit transaksi harian, dan sinkronisasi stok gudang.
    """
    return get_amg_sales_data(
        year=year,
        layer="raw",
        month=month,
        limit=limit,
        offset=offset,
        search=search
    )


@router.get("/financial", summary="Tab 2: Data Penjualan Financial Layer (Auto-Balanced / Adjusted)")
def get_financial_layer_sales(
    year: int = Query(2025, ge=2024, le=2026, description="Tahun transaksi (2024, 2025, 2026)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter bulan (1-12)"),
    limit: int = Query(100, ge=1, le=1000, description="Maksimum baris data yang diambil"),
    offset: int = Query(0, ge=0, description="Offset paginasi"),
    search: Optional[str] = Query(None, description="Pencarian nama customer, no invoice, atau barang")
) -> Dict[str, Any]:
    """
    **Tab 2 - Financial Layer:**
    Menampilkan data penjualan yang match 100% dengan Laporan Keuangan resmi audit:
    - **2024 & 2025:** Diterapkan mapping invoice typo dan auto-balancing baris penutup.
    - **2026:** Diterapkan eksklusi 6 nota ERP-only dan suntikan koreksi retur parsial via UNION ALL.
    """
    return get_amg_sales_data(
        year=year,
        layer="financial",
        month=month,
        limit=limit,
        offset=offset,
        search=search
    )


@router.get("/reconciliation", summary="Tab 3: Rekonsiliasi & Delta Varian (LK vs ERP)")
def get_sales_reconciliation(
    year: int = Query(2025, ge=2024, le=2026, description="Tahun transaksi untuk rekonsiliasi")
) -> Dict[str, Any]:
    """
    **Tab 3 - Reconciliation & Variance View:**
    Membandingkan total omzet antara Data Riil ERP (Tab 1) dan Laporan Keuangan (Tab 2) secara transparan,
    lengkap dengan delta selisih penyesuaian audit dan catatan penyesuaian akuntansi.
    """
    return get_amg_reconciliation_summary(year=year)


@router.get("/query-source", summary="Download / View Raw SQL Script")
def get_sql_source(
    year: int = Query(2025, ge=2024, le=2026),
    layer: str = Query("financial", enum=["raw", "financial"])
) -> Dict[str, str]:
    """
    Mengambil skrip teks SQL Server asli dari query yang digunakan di layer terkait.
    """
    filename = "qry_sales_agc_2024_raw_erp.sql" if (layer == "raw" and year == 2024) else (
        "qry_sales_agc_2024_finance_balanced.sql" if (layer == "financial" and year == 2024) else (
            "qry_sales_agc_2025_raw_erp.sql" if (layer == "raw" and year == 2025) else (
                "qry_sales_agc_2025_financial_balanced.sql" if (layer == "financial" and year == 2025) else (
                    "qry_sales_agc_2026_raw_erp.sql" if (layer == "raw" and year == 2026) else (
                        "qry_sales_agc_2026_financial_adjusted.sql"
                    )
                )
            )
        )
    )
    content = load_sql_query(filename)
    return {
        "filename": filename,
        "year": str(year),
        "layer": layer,
        "sql": content
    }

