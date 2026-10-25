from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Health Schemas ---
class DatabaseHealth(BaseModel):
    connected: bool
    latency_ms: float
    server_version: Optional[str] = None
    databases: List[str] = []
    server_host: str
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    database: DatabaseHealth
    timestamp: str

# --- Overview & KPI Schemas ---
class KpiItem(BaseModel):
    label: str
    value_formatted: str
    value_raw: Optional[float] = None
    badge_label: Optional[str] = None
    badge_variant: Optional[str] = "neutral"

class OverviewSummaryResponse(BaseModel):
    period: str
    entity: str
    source: str
    is_live_sql: bool
    database_queried: Optional[str] = None
    kpis: Dict[str, KpiItem]
    monthly_revenue: List[Dict[str, Any]]
    product_categories: List[Dict[str, Any]]
    top_customers: List[Dict[str, Any]]
    competitor_benchmarks: List[Dict[str, Any]]

