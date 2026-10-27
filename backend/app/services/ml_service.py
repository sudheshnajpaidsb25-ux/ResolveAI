import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import joblib
import pandas as pd
from app.config import settings
from app.schemas.ml import PredictRequest, PredictResponse, RiskFactor, MLMetricsResponse

_cached_model = None
_cached_metrics = None

def load_trained_model():
    global _cached_model
    if _cached_model is not None:
        return _cached_model
    if os.path.exists(settings.ML_MODEL_PATH):
        try:
            _cached_model = joblib.load(settings.ML_MODEL_PATH)
            return _cached_model
        except Exception as e:
            print(f"[ResolveAI ML] Warning: could not load model from {settings.ML_MODEL_PATH}: {e}")
            return None
    return None

def get_metrics_data() -> Optional[Dict[str, Any]]:
    global _cached_metrics
    if _cached_metrics is not None:
        return _cached_metrics
    if os.path.exists(settings.ML_METRICS_PATH):
        try:
            with open(settings.ML_METRICS_PATH, "r") as f:
                _cached_metrics = json.load(f)
                return _cached_metrics
        except Exception:
            return None
    return None

def compute_rule_based_fallback(req: PredictRequest) -> PredictResponse:
    """
    Transparent, documented rule-based fallback if ML model pipeline is uninitialized.
    Calculates estimated risk percentage and clearly flags `is_fallback: True`.
    """
    score = 15.0  # Base risk
    factors: List[RiskFactor] = []

    # Priority contribution
    if req.priority.upper() == "CRITICAL":
        score += 25.0
        factors.append(RiskFactor(
            feature="priority",
            label="Critical Priority SLA Window",
            impact="INCREASES_RISK",
            importance=0.25,
            description="4-hour tight resolution window increases breach probability"
        ))
    elif req.priority.upper() == "HIGH":
        score += 15.0
        factors.append(RiskFactor(
            feature="priority",
            label="High Priority",
            impact="INCREASES_RISK",
            importance=0.15,
            description="8-hour SLA constraint"
        ))

    # Elapsed vs remaining time
    total_time = (req.elapsed_minutes or 0) + (req.remaining_minutes or 240)
    consumed_ratio = (req.elapsed_minutes or 0) / max(1.0, total_time)
    if consumed_ratio > 0.8:
        score += 35.0
        factors.append(RiskFactor(
            feature="consumed_ratio",
            label="Over 80% SLA Consumed",
            impact="INCREASES_RISK",
            importance=0.35,
            description=f"{round(consumed_ratio * 100, 1)}% of allocated time has elapsed"
        ))
    elif consumed_ratio > 0.6:
        score += 20.0
        factors.append(RiskFactor(
            feature="consumed_ratio",
            label="Over 60% SLA Consumed",
            impact="INCREASES_RISK",
            importance=0.20,
            description=f"{round(consumed_ratio * 100, 1)}% of time elapsed"
        ))
    elif (req.remaining_minutes or 0) > 120:
        score -= 10.0
        factors.append(RiskFactor(
            feature="remaining_minutes",
            label="Healthy Remaining Time Buffer",
            impact="DECREASES_RISK",
            importance=0.10,
            description=f"{round(req.remaining_minutes or 0)} minutes remaining"
        ))

    # Workload
    if (req.technician_workload or 0) >= 5:
        score += 18.0
        factors.append(RiskFactor(
            feature="technician_workload",
            label="Technician Workload Saturated",
            impact="INCREASES_RISK",
            importance=0.18,
            description=f"Technician has {req.technician_workload} active incidents"
        ))
    elif (req.technician_workload or 0) <= 2:
        factors.append(RiskFactor(
            feature="technician_workload",
            label="Technician Has Open Capacity",
            impact="DECREASES_RISK",
            importance=0.08,
            description=f"Technician workload is low ({req.technician_workload})"
        ))

    # Reassignments
    if (req.reassignment_count or 0) > 1:
        score += 15.0
        factors.append(RiskFactor(
            feature="reassignment_count",
            label="Multiple Reassignments",
            impact="INCREASES_RISK",
            importance=0.15,
            description=f"Incident reassigned {req.reassignment_count} times"
        ))

    prob = min(98.0, max(2.0, score))
    if prob >= 70.0:
        risk_level = "High"
    elif prob >= 35.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return PredictResponse(
        breach_probability=round(prob, 1),
        risk_level=risk_level,
        explanation=f"Estimated {round(prob, 1)}% SLA breach probability (Rule-based Fallback).",
        top_factors=factors[:4],
        model_version="fallback-v1.0",
        model_type="Transparent Rule-based Heuristic",
        is_fallback=True,
        trained_at=None
    )

def predict_sla_breach(req: PredictRequest) -> PredictResponse:
    """
    Predicts SLA breach risk using the trained Scikit-learn Pipeline.
    Falls back gracefully to the rule-based heuristic if model is not yet compiled.
    """
    model = load_trained_model()
    if model is None:
        return compute_rule_based_fallback(req)

    now = datetime.utcnow()
    hour_of_day = now.hour
    day_of_week = now.weekday()

    elapsed = req.elapsed_minutes or 0.0
    remaining = req.remaining_minutes or 240.0
    total_time = max(1.0, elapsed + remaining)
    consumed_ratio = round(elapsed / total_time, 3)

    input_df = pd.DataFrame([{
        "category": req.category,
        "priority": req.priority,
        "impact": req.impact,
        "urgency": req.urgency,
        "status": req.status or "Open",
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "technician_workload": req.technician_workload or 0,
        "reassignment_count": req.reassignment_count or 0,
        "elapsed_minutes": elapsed,
        "remaining_minutes": remaining,
        "consumed_ratio": consumed_ratio
    }])

    try:
        probs = model.predict_proba(input_df)[0]
        # class 1 probability: breach probability
        breach_prob = float(probs[1]) * 100.0
        breach_prob = round(min(99.0, max(1.0, breach_prob)), 1)

        if breach_prob >= 70.0:
            risk_level = "High"
        elif breach_prob >= 35.0:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # Generate explainable risk factor breakdown
        factors: List[RiskFactor] = []
        
        # 1. Consumed SLA ratio factor
        if consumed_ratio >= 0.75:
            factors.append(RiskFactor(
                feature="consumed_ratio",
                label="High SLA Time Consumed",
                impact="INCREASES_RISK",
                importance=round(consumed_ratio, 2),
                description=f"{round(consumed_ratio * 100, 1)}% of resolution window has elapsed."
            ))
        elif consumed_ratio <= 0.3:
            factors.append(RiskFactor(
                feature="consumed_ratio",
                label="Early In Resolution Window",
                impact="DECREASES_RISK",
                importance=0.25,
                description=f"Only {round(consumed_ratio * 100, 1)}% of window consumed."
            ))

        # 2. Priority factor
        if req.priority.upper() in ["CRITICAL", "HIGH"]:
            factors.append(RiskFactor(
                feature="priority",
                label=f"{req.priority} Priority SLA Constraint",
                impact="INCREASES_RISK",
                importance=0.30 if req.priority.upper() == "CRITICAL" else 0.20,
                description=f"Strict turnaround target requires immediate resolution focus."
            ))

        # 3. Workload factor
        wl = req.technician_workload or 0
        if wl >= 5:
            factors.append(RiskFactor(
                feature="technician_workload",
                label="Assigned Technician Workload Saturation",
                impact="INCREASES_RISK",
                importance=min(0.40, round(wl * 0.05, 2)),
                description=f"Technician is currently handling {wl} active tickets."
            ))
        elif wl <= 2:
            factors.append(RiskFactor(
                feature="technician_workload",
                label="Sufficient Technician Bandwidth",
                impact="DECREASES_RISK",
                importance=0.18,
                description=f"Technician workload is manageable ({wl} active tickets)."
            ))

        # 4. Reassignment factor
        rc = req.reassignment_count or 0
        if rc > 0:
            factors.append(RiskFactor(
                feature="reassignment_count",
                label=f"Multiple Handoffs ({rc} reassignments)",
                impact="INCREASES_RISK",
                importance=round(min(0.35, rc * 0.12), 2),
                description="Ticket reassignments introduce context switching and delays."
            ))

        metrics = get_metrics_data()
        trained_date = metrics.get("trained_at") if metrics else None

        explanation = (
            f"Estimated {breach_prob}% breach probability based on {req.priority} priority, "
            f"{round(consumed_ratio * 100, 1)}% time consumed, and technician workload ({wl})."
        )

        return PredictResponse(
            breach_probability=breach_prob,
            risk_level=risk_level,
            explanation=explanation,
            top_factors=factors[:4],
            model_version="rf-v1.0",
            model_type="Random Forest Classifier (Ensemble)",
            is_fallback=False,
            trained_at=trained_date
        )
    except Exception as e:
        print(f"[ResolveAI ML] Inference error: {e}. Falling back to rule-based.")
        return compute_rule_based_fallback(req)
