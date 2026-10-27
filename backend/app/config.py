import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "ResolveAI — Intelligent IT Incident Management & SLA Prediction Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "resolveai-super-secret-jwt-key-college-major-project-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database (SQLite default for zero-friction local run, PostgreSQL supported via env)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resolveai.db")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # SLA Default Target Resolution Times (in hours)
    SLA_CRITICAL_HOURS: int = 4
    SLA_HIGH_HOURS: int = 8
    SLA_MEDIUM_HOURS: int = 24
    SLA_LOW_HOURS: int = 72
    
    # SLA Warning Thresholds (percentage consumed)
    SLA_WARNING_THRESHOLD_PERCENT: float = 75.0
    SLA_CRITICAL_THRESHOLD_PERCENT: float = 90.0
    
    # ML Models path
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ML_MODEL_PATH: str = os.path.join(BASE_DIR, "app", "ml", "models", "sla_model.joblib")
    ML_METRICS_PATH: str = os.path.join(BASE_DIR, "app", "ml", "models", "metrics.json")
    
    # Duplicate detection threshold
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.35

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
