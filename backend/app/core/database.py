import time
import logging
from typing import Optional, Dict, Any, Generator, List
from contextlib import contextmanager
import pyodbc

from app.core.config import settings

logger = logging.getLogger(__name__)

def build_connection_string(database: Optional[str] = None) -> str:
    base = settings.odbc_connection_string_base
    if database:
        return f"{base}DATABASE={database};"
    return base

@contextmanager
def get_db_connection(database: Optional[str] = None) -> Generator[pyodbc.Connection, None, None]:
    conn_str = build_connection_string(database)
    conn = None
    try:
        conn = pyodbc.connect(conn_str, timeout=settings.MSSQL_TIMEOUT)
        yield conn
    except Exception as exc:
        logger.error(f"Failed to connect to SQL Server (DB={database}): {exc}")
        raise
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass

def check_db_health() -> Dict[str, Any]:
    t0 = time.time()
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT @@VERSION")
            version_row = cursor.fetchone()
            version = version_row[0].split("\n")[0] if version_row else "Unknown"

            cursor.execute("""
                SELECT name 
                FROM sys.databases 
                WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
                ORDER BY name
            """)
            databases = [row[0] for row in cursor.fetchall()]

            latency_ms = round((time.time() - t0) * 1000, 2)
            return {
                "connected": True,
                "latency_ms": latency_ms,
                "server_version": version,
                "databases": databases,
                "server_host": settings.target_server,
                "error": None
            }
    except Exception as e:
        latency_ms = round((time.time() - t0) * 1000, 2)
        return {
            "connected": False,
            "latency_ms": latency_ms,
            "server_version": None,
            "databases": [],
            "server_host": settings.target_server,
            "error": str(e)
        }
