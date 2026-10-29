from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    overview,
    competitors,
    sales,
)

api_router = APIRouter()

api_router.include_router(overview.router, tags=["Overview & Ringkasan (Live SQL)"])
api_router.include_router(sales.router, tags=["PT AMG Sales (Dual-Layer ERP & Financial)"])
api_router.include_router(competitors.router, tags=["Competitor Benchmark"])
api_router.include_router(health.router, tags=["Health & System"])

