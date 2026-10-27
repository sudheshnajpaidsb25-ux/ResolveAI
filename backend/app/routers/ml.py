from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.ml import PredictRequest, PredictResponse, MLMetricsResponse, RetrainResponse
from app.services.ml_service import predict_sla_breach, get_metrics_data
from app.services.auth_service import get_current_user, require_role
from app.models.user import User
from app.ml.train_model import train_and_evaluate_model
import app.services.ml_service as ml_service_mod

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

@router.post("/predict", response_model=PredictResponse)
def predict_breach_risk(
    payload: PredictRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Predicts the SLA breach probability and risk level for a technical incident.
    Returns explainable top risk factors and feature importances.
    """
    prediction = predict_sla_breach(payload)
    return prediction

@router.get("/metrics", response_model=MLMetricsResponse)
def get_ml_metrics(current_user: User = Depends(get_current_user)):
    """
    Retrieves model validation metrics (Accuracy, Precision, Recall, F1, ROC-AUC, confusion matrix).
    """
    metrics = get_metrics_data()
    if not metrics:
        raise HTTPException(status_code=404, detail="Model metrics not found. Please train model.")
    return metrics

@router.post("/retrain", response_model=RetrainResponse)
def retrain_model(current_user: User = Depends(require_role(["Admin"]))):
    """
    Retrains the Random Forest SLA breach prediction model using fresh historical records.
    Re-evaluates validation metrics and hot-reloads model in memory.
    """
    try:
        metrics = train_and_evaluate_model()
        # Invalidate cached model
        ml_service_mod._cached_model = None
        ml_service_mod._cached_metrics = None
        return RetrainResponse(
            status="SUCCESS",
            message="SLA Breach Prediction Model retrained and evaluated successfully.",
            metrics=MLMetricsResponse(**metrics)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")
