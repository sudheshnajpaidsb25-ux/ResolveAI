import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.services.auth_service import require_role
from app.services.ml_service import get_metrics_data

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/system")
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    model_exists = os.path.exists(settings.ML_MODEL_PATH)
    metrics = get_metrics_data()

    return {
        "platform_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database_backend": "SQLite" if settings.DATABASE_URL.startswith("sqlite") else "PostgreSQL",
        "sla_defaults": {
            "critical_hours": settings.SLA_CRITICAL_HOURS,
            "high_hours": settings.SLA_HIGH_HOURS,
            "medium_hours": settings.SLA_MEDIUM_HOURS,
            "low_hours": settings.SLA_LOW_HOURS,
            "warning_threshold_percent": settings.SLA_WARNING_THRESHOLD_PERCENT,
            "critical_threshold_percent": settings.SLA_CRITICAL_THRESHOLD_PERCENT
        },
        "ml_model_status": {
            "is_trained": model_exists,
            "model_type": metrics.get("model_type") if metrics else "Heuristic Fallback",
            "accuracy": metrics.get("accuracy") if metrics else None,
            "trained_at": metrics.get("trained_at") if metrics else None
        }
    }

@router.post("/reset-demo")
def reset_demo_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    """
    Reseeds the database with clean demo incidents, users, and technicians.
    """
    from seed import run_seed
    try:
        run_seed()
        return {"status": "SUCCESS", "message": "Demo data successfully reseeded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset demo data: {str(e)}")
