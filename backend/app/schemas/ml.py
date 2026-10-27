from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class RiskFactor(BaseModel):
    feature: str
    label: str
    impact: str  # INCREASES_RISK, DECREASES_RISK, NEUTRAL
    importance: float  # Normalized weight or relative impact
    description: str

class PredictRequest(BaseModel):
    category: str
    priority: str
    impact: str = "Medium"
    urgency: str = "Medium"
    elapsed_minutes: Optional[float] = 0.0
    remaining_minutes: Optional[float] = 240.0
    technician_workload: Optional[int] = 0
    reassignment_count: Optional[int] = 0
    status: Optional[str] = "Open"

class PredictResponse(BaseModel):
    breach_probability: float  # 0 to 100
    risk_level: str  # Low, Medium, High
    explanation: str
    top_factors: List[RiskFactor]
    model_version: str
    model_type: str
    is_fallback: bool
    trained_at: Optional[str] = None

class MLMetricsResponse(BaseModel):
    model_type: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    confusion_matrix: List[List[int]]
    training_samples: int
    test_samples: int
    trained_at: str
    feature_importances: Dict[str, float]

class RetrainResponse(BaseModel):
    status: str
    message: str
    metrics: MLMetricsResponse
