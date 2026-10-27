from datetime import datetime
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.user import User
from app.models.notification import Notification
from app.models.activity import IncidentActivity
from app.services.sla_engine import compute_sla_status

def notify_user_or_admins(
    db: Session,
    user_id: int | None,
    incident_id: int,
    title: str,
    message: str,
    notif_type: str
):
    if user_id:
        notif = Notification(
            user_id=user_id,
            incident_id=incident_id,
            title=title,
            message=message,
            notification_type=notif_type,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
    else:
        # Send to all Admins
        admins = db.query(User).filter(User.role == "Admin", User.is_active == True).all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                incident_id=incident_id,
                title=title,
                message=message,
                notification_type=notif_type,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(notif)

def check_sla_deadlines_and_breaches(db: Session) -> dict:
    """
    Checks all open/in-progress incidents against their SLA deadlines.
    Updates breach statuses and generates notifications safely preventing duplicates.
    """
    open_incidents = (
        db.query(Incident)
        .filter(Incident.status.notin_(["Resolved", "Closed"]))
        .all()
    )

    breached_count = 0
    warning_count = 0
    critical_warning_count = 0

    for inc in open_incidents:
        status_info = compute_sla_status(inc, db)
        
        # Check Breach
        if status_info.is_breached:
            if not inc.is_sla_breached:
                inc.is_sla_breached = True
            if not inc.breach_notified:
                inc.breach_notified = True
                breached_count += 1
                
                # Notify Assigned Technician
                if inc.assigned_technician_id:
                    notify_user_or_admins(
                        db, inc.assigned_technician_id, inc.id,
                        f"🚨 SLA Breached: {inc.incident_number}",
                        f"Incident '{inc.title}' has breached its SLA deadline by {abs(status_info.remaining_minutes):.1f} minutes.",
                        "SLA_BREACH"
                    )
                # Notify Admins
                notify_user_or_admins(
                    db, None, inc.id,
                    f"🚨 SLA Breached: {inc.incident_number}",
                    f"Incident '{inc.title}' (Priority: {inc.priority}) has breached SLA. Assigned: {inc.assigned_technician.full_name if inc.assigned_technician else 'Unassigned'}.",
                    "SLA_BREACH"
                )

                # Log activity
                activity = IncidentActivity(
                    incident_id=inc.id,
                    action="SLA_BREACHED",
                    details=f"SLA deadline breached. Time elapsed: {status_info.elapsed_minutes:.1f} mins.",
                    created_at=datetime.utcnow()
                )
                db.add(activity)

        # Check Critical Warning (>= 90%)
        elif status_info.status == "CRITICAL_WARNING":
            if not inc.critical_warning_notified:
                inc.critical_warning_notified = True
                critical_warning_count += 1
                
                target_user = inc.assigned_technician_id
                notify_user_or_admins(
                    db, target_user, inc.id,
                    f"⚠️ Critical SLA Warning: {inc.incident_number}",
                    f"Incident '{inc.title}' has consumed {status_info.percentage_consumed}% of SLA. Remaining: {status_info.remaining_minutes:.1f} mins.",
                    "SLA_WARNING"
                )

                activity = IncidentActivity(
                    incident_id=inc.id,
                    action="SLA_CRITICAL_WARNING",
                    details=f"Over 90% SLA consumed ({status_info.percentage_consumed}%). Only {status_info.remaining_minutes:.1f} mins remaining.",
                    created_at=datetime.utcnow()
                )
                db.add(activity)

        # Check Warning (>= 75%)
        elif status_info.status == "WARNING":
            if not inc.warning_notified:
                inc.warning_notified = True
                warning_count += 1

                target_user = inc.assigned_technician_id
                notify_user_or_admins(
                    db, target_user, inc.id,
                    f"⏳ Approaching SLA Deadline: {inc.incident_number}",
                    f"Incident '{inc.title}' has reached {status_info.percentage_consumed}% of SLA resolution window.",
                    "SLA_WARNING"
                )

                activity = IncidentActivity(
                    incident_id=inc.id,
                    action="SLA_WARNING",
                    details=f"75% SLA warning threshold reached. Remaining: {status_info.remaining_minutes:.1f} mins.",
                    created_at=datetime.utcnow()
                )
                db.add(activity)

    db.commit()

    return {
        "checked_incidents": len(open_incidents),
        "newly_breached": breached_count,
        "new_critical_warnings": critical_warning_count,
        "new_warnings": warning_count,
        "timestamp": datetime.utcnow().isoformat()
    }
