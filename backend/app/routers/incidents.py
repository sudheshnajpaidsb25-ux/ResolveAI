from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.incident import Incident
from app.models.user import User
from app.models.technician import TechnicianProfile
from app.models.comment import IncidentComment
from app.models.activity import IncidentActivity
from app.models.notification import Notification
from app.models.prediction_record import PredictionRecord
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, IncidentDetailResponse,
    IncidentStatusChange, IncidentAssignOverride, IncidentListResponse
)
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.ml import PredictRequest
from app.services.auth_service import get_current_user, require_role
from app.services.sla_engine import calculate_deadline, compute_sla_status
from app.services.assignment_engine import auto_assign_technician
from app.services.ml_service import predict_sla_breach
from app.services.duplicate_detector import find_duplicate_incidents

router = APIRouter(prefix="/incidents", tags=["Incidents"])

def generate_incident_number(db: Session) -> str:
    count = db.query(func.count(Incident.id)).scalar() or 0
    return f"INC-{1001 + count}"

@router.get("", response_model=IncidentListResponse)
def get_incidents(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    technician_id: Optional[int] = None,
    search: Optional[str] = None,
    breached_only: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident)

    # Role Scoping
    if current_user.role == "Employee":
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == "Technician":
        # Technicians see tickets assigned to them or unassigned tickets
        if technician_id:
            query = query.filter(Incident.assigned_technician_id == technician_id)
        else:
            query = query.filter(
                (Incident.assigned_technician_id == current_user.id) |
                (Incident.assigned_technician_id == None)
            )
    else:
        # Admin can filter by any technician
        if technician_id:
            query = query.filter(Incident.assigned_technician_id == technician_id)

    # Filters
    if status and status != "All":
        query = query.filter(Incident.status == status)
    if priority and priority != "All":
        query = query.filter(Incident.priority == priority)
    if category and category != "All":
        query = query.filter(Incident.category == category)
    if breached_only:
        query = query.filter(Incident.is_sla_breached == True)
    if search:
        query = query.filter(
            (Incident.title.ilike(f"%{search}%")) |
            (Incident.incident_number.ilike(f"%{search}%")) |
            (Incident.description.ilike(f"%{search}%"))
        )

    total = query.count()
    incidents = (
        query.order_by(Incident.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Attach computed SLA status & prediction for response
    result_items = []
    for inc in incidents:
        sla_info = compute_sla_status(inc, db)
        
        # Build quick prediction request
        wl = inc.assigned_technician.technician_profile.current_workload if (inc.assigned_technician and inc.assigned_technician.technician_profile) else 0
        pred_req = PredictRequest(
            category=inc.category,
            priority=inc.priority,
            impact=inc.impact,
            urgency=inc.urgency,
            elapsed_minutes=sla_info.elapsed_minutes,
            remaining_minutes=sla_info.remaining_minutes,
            technician_workload=wl,
            reassignment_count=inc.reassignment_count,
            status=inc.status
        )
        prediction = predict_sla_breach(pred_req)

        resp = IncidentResponse.model_validate(inc)
        resp.sla_status = sla_info
        resp.prediction = prediction
        result_items.append(resp)

    return IncidentListResponse(
        total=total,
        items=result_items,
        page=page,
        page_size=page_size
    )

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc_number = generate_incident_number(db)
    now = datetime.utcnow()
    deadline, target_hours = calculate_deadline(now, payload.priority, db)

    # 1. Run Technician Assignment Engine
    assigned_tech, assignment_reason = auto_assign_technician(
        db=db,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        priority=payload.priority
    )

    initial_status = "Assigned" if assigned_tech else "Open"

    incident = Incident(
        incident_number=inc_number,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        impact=payload.impact,
        urgency=payload.urgency,
        status=initial_status,
        reporter_id=current_user.id,
        assigned_technician_id=assigned_tech.id if assigned_tech else None,
        assignment_reason=assignment_reason,
        reassignment_count=0,
        sla_deadline=deadline,
        created_at=now,
        updated_at=now
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # 2. Audit Trail Logs
    create_log = IncidentActivity(
        incident_id=incident.id,
        user_id=current_user.id,
        action="CREATED",
        details=f"Incident {inc_number} reported by {current_user.full_name} ({payload.category}, {payload.priority} Priority). Target SLA: {target_hours}h.",
        created_at=now
    )
    db.add(create_log)

    if assigned_tech:
        assign_log = IncidentActivity(
            incident_id=incident.id,
            user_id=None,
            action="ASSIGNED",
            details=assignment_reason,
            created_at=now
        )
        db.add(assign_log)

        # Notify Assigned Technician
        notif = Notification(
            user_id=assigned_tech.id,
            incident_id=incident.id,
            title=f"📋 New Incident Assigned: {inc_number}",
            message=f"You have been assigned '{payload.title}' ({payload.priority} Priority). SLA Deadline: {deadline.strftime('%Y-%m-%d %H:%M UTC')}.",
            notification_type="ASSIGNMENT",
            created_at=now
        )
        db.add(notif)
    else:
        # Notify Admins of unassigned incident
        admins = db.query(User).filter(User.role == "Admin", User.is_active == True).all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                incident_id=incident.id,
                title=f"⚠️ Unassigned Incident: {inc_number}",
                message=f"Incident '{payload.title}' ({payload.priority}) could not be auto-assigned: {assignment_reason}",
                notification_type="UNASSIGNED",
                created_at=now
            )
            db.add(notif)

    # 3. Compute Initial ML SLA Breach Prediction & save record
    pred_req = PredictRequest(
        category=incident.category,
        priority=incident.priority,
        impact=incident.impact,
        urgency=incident.urgency,
        elapsed_minutes=0.0,
        remaining_minutes=target_hours * 60.0,
        technician_workload=assigned_tech.technician_profile.current_workload if (assigned_tech and assigned_tech.technician_profile) else 0,
        reassignment_count=0,
        status=incident.status
    )
    prediction = predict_sla_breach(pred_req)

    pred_record = PredictionRecord(
        incident_id=incident.id,
        breach_probability=prediction.breach_probability,
        risk_level=prediction.risk_level,
        top_factors=str([f.model_dump() for f in prediction.top_factors]),
        model_version=prediction.model_version,
        is_fallback=prediction.is_fallback,
        created_at=now
    )
    db.add(pred_record)
    db.commit()

    sla_info = compute_sla_status(incident, db)
    resp = IncidentResponse.model_validate(incident)
    resp.sla_status = sla_info
    resp.prediction = prediction
    return resp

@router.get("/{id}", response_model=IncidentDetailResponse)
def get_incident_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Scoping check
    if current_user.role == "Employee" and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this incident")

    sla_info = compute_sla_status(incident, db)

    # Fetch ML Prediction
    wl = incident.assigned_technician.technician_profile.current_workload if (incident.assigned_technician and incident.assigned_technician.technician_profile) else 0
    pred_req = PredictRequest(
        category=incident.category,
        priority=incident.priority,
        impact=incident.impact,
        urgency=incident.urgency,
        elapsed_minutes=sla_info.elapsed_minutes,
        remaining_minutes=sla_info.remaining_minutes,
        technician_workload=wl,
        reassignment_count=incident.reassignment_count,
        status=incident.status
    )
    prediction = predict_sla_breach(pred_req)

    # Find potential duplicate / similar incidents
    similar_incidents = find_duplicate_incidents(
        title=incident.title,
        description=incident.description,
        db=db,
        exclude_id=incident.id,
        limit=4
    )

    resp = IncidentDetailResponse.model_validate(incident)
    resp.sla_status = sla_info
    resp.prediction = prediction
    resp.similar_incidents = similar_incidents
    return resp

@router.post("/{id}/status", response_model=IncidentResponse)
def update_incident_status(
    id: int,
    payload: IncidentStatusChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = incident.status
    new_status = payload.status

    # Role validation
    if current_user.role == "Employee":
        if old_status in ["Resolved", "Closed"] and new_status == "Open":
            # Allowed to reopen
            pass
        else:
            raise HTTPException(status_code=403, detail="Employees may only reopen resolved tickets")
    elif current_user.role == "Technician":
        if incident.assigned_technician_id != current_user.id and current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized to update an incident assigned to another technician")

    now = datetime.utcnow()
    incident.status = new_status
    incident.updated_at = now

    # Workload adjustment
    tech_profile = None
    if incident.assigned_technician_id:
        tech_profile = db.query(TechnicianProfile).filter(TechnicianProfile.user_id == incident.assigned_technician_id).first()

    if new_status in ["Resolved", "Closed"] and old_status not in ["Resolved", "Closed"]:
        incident.resolved_at = now
        incident.resolution_notes = payload.resolution_notes or incident.resolution_notes
        delta_mins = int((now - incident.created_at).total_seconds() / 60)
        incident.resolution_time_minutes = delta_mins
        
        # Decrement technician workload & increment resolved count
        if tech_profile and tech_profile.current_workload > 0:
            tech_profile.current_workload = max(0, tech_profile.current_workload - 1)
            tech_profile.total_resolved += 1

        # Notify reporter
        notif = Notification(
            user_id=incident.reporter_id,
            incident_id=incident.id,
            title=f"✅ Incident Resolved: {incident.incident_number}",
            message=f"Your incident '{incident.title}' has been marked as Resolved. Notes: {incident.resolution_notes or 'Issue addressed.'}",
            notification_type="STATUS_UPDATE",
            created_at=now
        )
        db.add(notif)

    elif old_status in ["Resolved", "Closed"] and new_status == "Open":
        # Reopening
        incident.resolved_at = None
        if tech_profile:
            tech_profile.current_workload += 1

    # Audit Trail
    activity = IncidentActivity(
        incident_id=incident.id,
        user_id=current_user.id,
        action="STATUS_CHANGED",
        details=f"Status transitioned from '{old_status}' to '{new_status}' by {current_user.full_name}." + (f" Notes: {payload.resolution_notes}" if payload.resolution_notes else ""),
        old_value=old_status,
        new_value=new_status,
        created_at=now
    )
    db.add(activity)
    db.commit()
    db.refresh(incident)

    sla_info = compute_sla_status(incident, db)
    resp = IncidentResponse.model_validate(incident)
    resp.sla_status = sla_info
    return resp

@router.post("/{id}/assign", response_model=IncidentResponse)
def override_assignment(
    id: int,
    payload: IncidentAssignOverride,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    new_tech_user = db.query(User).filter(User.id == payload.technician_id, User.role == "Technician").first()
    if not new_tech_user:
        raise HTTPException(status_code=404, detail="Technician not found")

    now = datetime.utcnow()
    old_tech_id = incident.assigned_technician_id

    # Decrement old tech workload if incident was active
    if old_tech_id and incident.status not in ["Resolved", "Closed"]:
        old_profile = db.query(TechnicianProfile).filter(TechnicianProfile.user_id == old_tech_id).first()
        if old_profile and old_profile.current_workload > 0:
            old_profile.current_workload -= 1

    # Increment new tech workload
    new_profile = db.query(TechnicianProfile).filter(TechnicianProfile.user_id == new_tech_user.id).first()
    if new_profile and incident.status not in ["Resolved", "Closed"]:
        new_profile.current_workload += 1

    incident.assigned_technician_id = new_tech_user.id
    incident.assignment_reason = f"Admin override by {current_user.full_name}: {payload.reason}"
    incident.reassignment_count += 1
    incident.updated_at = now
    if incident.status == "Open":
        incident.status = "Assigned"

    # Audit Trail
    activity = IncidentActivity(
        incident_id=incident.id,
        user_id=current_user.id,
        action="OVERRIDE_ASSIGNMENT",
        details=f"Admin {current_user.full_name} assigned incident to {new_tech_user.full_name}. Rationale: {payload.reason}",
        old_value=str(old_tech_id),
        new_value=str(new_tech_user.id),
        created_at=now
    )
    db.add(activity)

    # Notify new technician
    notif = Notification(
        user_id=new_tech_user.id,
        incident_id=incident.id,
        title=f"📋 Reassigned Incident: {incident.incident_number}",
        message=f"Administrator {current_user.full_name} reassigned '{incident.title}' to you. Reason: {payload.reason}",
        notification_type="REASSIGNMENT",
        created_at=now
    )
    db.add(notif)

    db.commit()
    db.refresh(incident)

    sla_info = compute_sla_status(incident, db)
    resp = IncidentResponse.model_validate(incident)
    resp.sla_status = sla_info
    return resp

@router.post("/{id}/comments", response_model=CommentResponse)
def add_incident_comment(
    id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if current_user.role == "Employee" and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to comment on this incident")

    # Employees cannot post internal comments
    is_internal = payload.is_internal if current_user.role in ["Admin", "Technician"] else False

    comment = IncidentComment(
        incident_id=incident.id,
        user_id=current_user.id,
        content=payload.content,
        is_internal=is_internal,
        created_at=datetime.utcnow()
    )
    db.add(comment)

    # Activity log
    activity = IncidentActivity(
        incident_id=incident.id,
        user_id=current_user.id,
        action="COMMENT_ADDED",
        details=f"{'Internal note' if is_internal else 'Comment'} added by {current_user.full_name}",
        created_at=datetime.utcnow()
    )
    db.add(activity)

    # Notify counterpart (if reporter commented, notify tech; if tech commented, notify reporter)
    if not is_internal:
        if current_user.id == incident.reporter_id and incident.assigned_technician_id:
            db.add(Notification(
                user_id=incident.assigned_technician_id,
                incident_id=incident.id,
                title=f"💬 New Comment on {incident.incident_number}",
                message=f"Reporter {current_user.full_name} commented: '{payload.content[:80]}...'",
                notification_type="STATUS_UPDATE",
                created_at=datetime.utcnow()
            ))
        elif current_user.id == incident.assigned_technician_id:
            db.add(Notification(
                user_id=incident.reporter_id,
                incident_id=incident.id,
                title=f"💬 Update on {incident.incident_number}",
                message=f"Technician {current_user.full_name} commented: '{payload.content[:80]}...'",
                notification_type="STATUS_UPDATE",
                created_at=datetime.utcnow()
            ))

    db.commit()
    db.refresh(comment)
    return comment
