from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.sla_policy import SLAPolicy
from app.models.incident import Incident
from app.models.user import User
from app.schemas.sla import SLAPolicyResponse, SLAPolicyUpdate, SLAStatusInfo
from app.services.auth_service import get_current_user, require_role
from app.services.sla_engine import compute_sla_status
from app.services.background_checker import check_sla_deadlines_and_breaches

router = APIRouter(prefix="/sla", tags=["SLA Monitoring"])

@router.get("/policies", response_model=List[SLAPolicyResponse])
def get_sla_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policies = db.query(SLAPolicy).order_by(SLAPolicy.id.asc()).all()
    return policies

@router.put("/policies/{id}", response_model=SLAPolicyResponse)
def update_sla_policy(
    id: int,
    payload: SLAPolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    policy = db.query(SLAPolicy).filter(SLAPolicy.id == id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="SLA Policy not found")

    if payload.target_resolution_hours is not None:
        policy.target_resolution_hours = payload.target_resolution_hours
    if payload.warning_threshold_percent is not None:
        policy.warning_threshold_percent = payload.warning_threshold_percent
    if payload.critical_threshold_percent is not None:
        policy.critical_threshold_percent = payload.critical_threshold_percent
    if payload.description is not None:
        policy.description = payload.description

    db.commit()
    db.refresh(policy)
    return policy

@router.get("/status/{incident_id}", response_model=SLAStatusInfo)
def get_incident_sla_status(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return compute_sla_status(incident, db)

@router.post("/check-now")
def run_sla_check_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually triggers deadline check across all active incidents.
    Updates breach records and generates persistable notifications.
    """
    result = check_sla_deadlines_and_breaches(db)
    return result
