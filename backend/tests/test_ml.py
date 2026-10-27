from app.schemas.ml import PredictRequest
from app.services.ml_service import predict_sla_breach, compute_rule_based_fallback

def test_ml_prediction_pipeline():
    req = PredictRequest(
        category="Network",
        priority="Critical",
        impact="High",
        urgency="High",
        elapsed_minutes=210.0,  # 3.5 hours out of 4h consumed
        remaining_minutes=30.0,
        technician_workload=6,
        reassignment_count=2,
        status="In Progress"
    )

    pred = predict_sla_breach(req)
    assert 0.0 <= pred.breach_probability <= 100.0
    assert pred.risk_level in ["Low", "Medium", "High"]
    # High elapsed time, critical priority, high workload -> High risk
    assert pred.risk_level == "High"
    assert len(pred.top_factors) > 0
    assert any(f.impact == "INCREASES_RISK" for f in pred.top_factors)

def test_ml_rule_based_fallback():
    req = PredictRequest(
        category="Software",
        priority="Low",
        impact="Low",
        urgency="Low",
        elapsed_minutes=10.0,
        remaining_minutes=4000.0,
        technician_workload=1,
        reassignment_count=0,
        status="Open"
    )

    fallback = compute_rule_based_fallback(req)
    assert fallback.is_fallback == True
    assert fallback.risk_level == "Low"
    assert fallback.breach_probability < 35.0
