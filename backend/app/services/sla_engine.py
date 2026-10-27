from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.models.incident import Incident
from app.models.sla_policy import SLAPolicy
from app.schemas.sla import SLAStatusInfo

def get_policy_target_hours(priority: str, db: Optional[Session] = None) -> float:
    if db:
        policy = db.query(SLAPolicy).filter(SLAPolicy.priority.ilike(priority)).first()
        if policy:
            return policy.target_resolution_hours

    # Fallback to defaults
    priority_upper = priority.upper()
    if priority_upper == "CRITICAL":
        return float(settings.SLA_CRITICAL_HOURS)
    elif priority_upper == "HIGH":
        return float(settings.SLA_HIGH_HOURS)
    elif priority_upper == "MEDIUM":
        return float(settings.SLA_MEDIUM_HOURS)
    else:
        return float(settings.SLA_LOW_HOURS)

def calculate_deadline(created_at: datetime, priority: str, db: Optional[Session] = None) -> Tuple[datetime, float]:
    target_hours = get_policy_target_hours(priority, db)
    deadline = created_at + timedelta(hours=target_hours)
    return deadline, target_hours

def compute_sla_status(incident: Incident, db: Optional[Session] = None) -> SLAStatusInfo:
    target_hours = get_policy_target_hours(incident.priority, db)
    total_minutes = max(1.0, target_hours * 60.0)
    
    # Thresholds
    warning_pct = settings.SLA_WARNING_THRESHOLD_PERCENT
    critical_pct = settings.SLA_CRITICAL_THRESHOLD_PERCENT
    if incident.sla_policy:
        warning_pct = incident.sla_policy.warning_threshold_percent
        critical_pct = incident.sla_policy.critical_threshold_percent

    deadline = incident.sla_deadline
    if not deadline:
        deadline = incident.created_at + timedelta(hours=target_hours)

    is_resolved = incident.status in ["Resolved", "Closed"]
    
    if is_resolved:
        end_time = incident.resolved_at or incident.updated_at or datetime.utcnow()
        elapsed_delta = end_time - incident.created_at
        elapsed_minutes = max(0.0, elapsed_delta.total_seconds() / 60.0)
        remaining_minutes = max(0.0, (deadline - end_time).total_seconds() / 60.0) if end_time < deadline else 0.0
        pct_consumed = min(100.0, (elapsed_minutes / total_minutes) * 100.0)
        is_breached = end_time > deadline
        status_label = "BREACHED" if is_breached else "MET"
    else:
        now = datetime.utcnow()
        elapsed_delta = now - incident.created_at
        elapsed_minutes = max(0.0, elapsed_delta.total_seconds() / 60.0)
        remaining_delta = deadline - now
        remaining_minutes = remaining_delta.total_seconds() / 60.0
        
        if total_minutes > 0:
            pct_consumed = (elapsed_minutes / total_minutes) * 100.0
        else:
            pct_consumed = 100.0

        if now > deadline:
            is_breached = True
            status_label = "BREACHED"
        elif pct_consumed >= critical_pct:
            is_breached = False
            status_label = "CRITICAL_WARNING"
        elif pct_consumed >= warning_pct:
            is_breached = False
            status_label = "WARNING"
        else:
            is_breached = False
            status_label = "NORMAL"

    return SLAStatusInfo(
        priority=incident.priority,
        target_hours=target_hours,
        deadline=deadline,
        elapsed_minutes=round(elapsed_minutes, 1),
        remaining_minutes=round(remaining_minutes, 1),
        percentage_consumed=round(min(100.0, max(0.0, pct_consumed)), 1),
        status=status_label,
        is_breached=is_breached
    )
