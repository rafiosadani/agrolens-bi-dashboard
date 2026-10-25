import json
from typing import List, Dict, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AgroLens BI & Analytics Engine"

    # MS SQL Server Settings
    MSSQL_HOST: str = "127.0.0.1"
    MSSQL_PORT: int = 1435  # Local dev port (production default: 1433)
    MSSQL_SERVER: Optional[str] = None  # If provided, overrides host and port (e.g. "127.0.0.1,1435" or "192.168.2.99,1435")
    MSSQL_USER: str = "sa"
    MSSQL_PASSWORD: str = "Xy#9pL$2vN!k4W"
    MSSQL_DRIVER: str = "ODBC Driver 18 for SQL Server"
    MSSQL_TRUST_CERT: str = "yes"
    MSSQL_TIMEOUT: int = 5

    # Caching and Fallback
    CACHE_TTL_SECONDS: int = 120
    MOCK_DATA_FALLBACK: bool = True

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            return json.loads(v)
        return v

    # Enterprise Catalog Mappings
    ENTITY_DATABASE_MAP: Dict[str, List[str]] = {
        "API": ["APIdb001", "APIdb002", "APIdb003"],
        "AMG": ["AGCdb001", "AGCdb002", "AGCdb003"],
        "ANR": ["AGFdb002", "AGFdb003"],
        "TTM": ["TTMdb002"],
        "MAA": ["MAAdb001"],
        "SAP": ["SAPdb001"],
    }

    # Entity to DB Prefix mapping (AGC -> AMG, AGF -> ANR)
    ENTITY_DB_PREFIX: Dict[str, str] = {
        "API": "API",
        "AMG": "AGC",  # PT Agrochem Mega Globalindo
        "ANR": "AGF",  # PT Agrofarm Nusa Raya
        "TTM": "TTM",  # PT Talenta Tiga Muda
        "MAA": "MAA",  # PT Mycotech Agro Asia
        "SAP": "SAP",  # PT Sarana Agro Panata
    }

    # Year to Suffix mapping (001 -> 2024, 002 -> 2025, 003 -> 2026, 004 -> 2027)
    YEAR_SUFFIX_MAP: Dict[int, str] = {
        2024: "001",
        2025: "002",
        2026: "003",
        2027: "004",
        2028: "005",
    }

    def resolve_db_name(self, entity_code: str, year: int = 2026) -> str:
        code = entity_code.upper().strip()
        prefix = self.ENTITY_DB_PREFIX.get(code, code)
        suffix = self.YEAR_SUFFIX_MAP.get(year, f"00{year - 2023}")
        return f"{prefix}db{suffix}"

    # Eliminasi Afiliasi (Perusahaan Internal Grup) - Tanpa Ortani
    AFFILIATED_COMPANIES: List[str] = [
        "Agrofarm Nusa Raya",
        "Agrochem Mega Globalindo",
        "Agri Prime International",
        "Talenta Tiga Muda",
        "Mycotech Agro Asia",
        "Sarana Agro Panata",
        "Sarana Benih Panata",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def target_server(self) -> str:
        if self.MSSQL_SERVER:
            return self.MSSQL_SERVER
        return f"{self.MSSQL_HOST},{self.MSSQL_PORT}"

    @property
    def odbc_connection_string_base(self) -> str:
        return (
            f"DRIVER={{{self.MSSQL_DRIVER}}};"
            f"SERVER={self.target_server};"
            f"UID={self.MSSQL_USER};"
            f"PWD={self.MSSQL_PASSWORD};"
            f"TrustServerCertificate={self.MSSQL_TRUST_CERT};"
            f"Connection Timeout={self.MSSQL_TIMEOUT};"
        )

settings = Settings()
