from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_db_health
from app.models.schemas import HealthResponse, DatabaseHealth

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def get_system_health():
    db_info = check_db_health()
    return HealthResponse(
        status="operational",
        service=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
        database=DatabaseHealth(
            connected=db_info["connected"],
            latency_ms=db_info["latency_ms"],
            server_version=db_info["server_version"],
            databases=db_info["databases"],
            server_host=db_info["server_host"],
            error=db_info["error"]
        ),
        timestamp=datetime.utcnow().isoformat()
    )
