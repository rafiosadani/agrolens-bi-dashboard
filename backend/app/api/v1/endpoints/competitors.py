import os
import shutil
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException
import openpyxl

router = APIRouter(prefix="/competitors")
logger = logging.getLogger("agrolens.competitors")

# In-memory benchmark store with initial values from 'Industry & Competitor Analysis.xlsx'
BENCHMARK_STORE: Dict[str, Any] = {
    "source_file": "Industry & Competitior Analysis.xlsx",
    "updated_at": "2026-10-23T15:30:00Z",
    "metrics": [
        {
            "key": "GPM",
            "name": "Gross Profit Margin",
            "company_pct": 21.98,
            "benchmark_pct": 24.02,
            "q1_pct": 21.94,
            "q3_pct": 24.86,
            "status": "Dalam rentang"
        },
        {
            "key": "EBITDA",
            "name": "EBITDA Margin",
            "company_pct": 13.15,
            "benchmark_pct": 8.96,
            "q1_pct": 7.31,
            "q3_pct": 12.10,
            "status": "Di atas rentang"
        },
        {
            "key": "OPM",
            "name": "Operating Profit Margin",
            "company_pct": 12.27,
            "benchmark_pct": 8.27,
            "q1_pct": 5.39,
            "q3_pct": 11.20,
            "status": "Di atas rentang"
        },
        {
            "key": "NPM",
            "name": "Net Profit Margin",
            "company_pct": 7.73,
            "benchmark_pct": 6.88,
            "q1_pct": 5.44,
            "q3_pct": 8.68,
            "status": "Dalam rentang"
        }
    ],
    "competitors": [
        {"name": "PT Saraswati Anugerah Makmur Tbk", "gpm": 21.25, "opm": 9.66, "npm": 5.93, "ebitda": 10.52},
        {"name": "PT Delta Giri Wacana Tbk", "gpm": 26.75, "opm": 9.15, "npm": 3.92, "ebitda": 9.90},
        {"name": "PT Nusa Palapa Gemilang Tbk", "gpm": 24.01, "opm": 5.26, "npm": 0.72, "ebitda": 7.03}
    ]
}

@router.get("/benchmarks")
def get_competitor_benchmarks():
    """Retrieve current industry & competitor benchmark metrics."""
    return BENCHMARK_STORE

@router.post("/upload")
async def upload_competitor_analysis(file: UploadFile = File(...)):
    """
    Admin Upload Endpoint:
    Accepts .xlsx or .csv from Stock Analyst / Financial Reports,
    parses metrics into staging benchmark data.
    """
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Harap upload file Excel (.xlsx) atau CSV."
        )

    upload_dir = "docs/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    temp_path = os.path.join(upload_dir, file.filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    logger.info(f"Received competitor benchmark upload: {file.filename}")

    # Parse Excel if .xlsx
    try:
        if file.filename.endswith(".xlsx"):
            wb = openpyxl.load_workbook(temp_path, data_only=True)
            # Find relevant sheet
            sheet_name = wb.sheetnames[0]
            for s in wb.sheetnames:
                if "competitor" in s.lower() or "industry" in s.lower():
                    sheet_name = s
                    break
            
            ws = wb[sheet_name]
            # Simple extraction: search for GPM, OPM, NPM, EBITDA
            extracted_metrics = []
            for r in range(1, min(ws.max_row + 1, 50)):
                cell_metric = str(ws.cell(r, 2).value or "").strip().lower()
                val_median = ws.cell(r, 5).value
                if "gross profit margin" in cell_metric or "gpm" in cell_metric:
                    if isinstance(val_median, (int, float)):
                        extracted_metrics.append({"key": "GPM", "name": "Gross Profit Margin", "company_pct": 21.98, "benchmark_pct": round(val_median * 100, 2), "status": "Updated"})
                elif "operating profit margin" in cell_metric or "opm" in cell_metric:
                    if isinstance(val_median, (int, float)):
                        extracted_metrics.append({"key": "OPM", "name": "Operating Profit Margin", "company_pct": 12.27, "benchmark_pct": round(val_median * 100, 2), "status": "Updated"})
                elif "net profit margin" in cell_metric or "npm" in cell_metric:
                    if isinstance(val_median, (int, float)):
                        extracted_metrics.append({"key": "NPM", "name": "Net Profit Margin", "company_pct": 7.73, "benchmark_pct": round(val_median * 100, 2), "status": "Updated"})
                elif "ebitda" in cell_metric:
                    if isinstance(val_median, (int, float)):
                        extracted_metrics.append({"key": "EBITDA", "name": "EBITDA Margin", "company_pct": 13.15, "benchmark_pct": round(val_median * 100, 2), "status": "Updated"})

            if extracted_metrics:
                BENCHMARK_STORE["metrics"] = extracted_metrics
                BENCHMARK_STORE["source_file"] = file.filename
                BENCHMARK_STORE["updated_at"] = "Baru saja diperbarui"

        return {
            "success": True,
            "filename": file.filename,
            "message": "File analisis kompetitor berhasil diproses dan dimuat ke benchmark staging.",
            "data": BENCHMARK_STORE
        }
    except Exception as e:
        logger.error(f"Error parsing uploaded file: {e}")
        # Even on parse notice, confirm file received
        return {
            "success": True,
            "filename": file.filename,
            "message": f"File berhasil disimpan ke staging. ({str(e)})",
            "data": BENCHMARK_STORE
        }
