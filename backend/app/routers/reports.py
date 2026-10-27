import csv
import io
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.incident import Incident
from app.models.user import User
from app.models.technician import TechnicianProfile
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/summary")
def get_reports_summary(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    since_date = datetime.utcnow() - timedelta(days=days)
    query = db.query(Incident).filter(Incident.created_at >= since_date)

    if current_user.role == "Employee":
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == "Technician":
        query = query.filter(Incident.assigned_technician_id == current_user.id)

    if category and category != "All":
        query = query.filter(Incident.category == category)
    if priority and priority != "All":
        query = query.filter(Incident.priority == priority)

    incidents = query.all()
    total = len(incidents)
    resolved = [i for i in incidents if i.status in ["Resolved", "Closed"]]
    breached = [i for i in incidents if i.is_sla_breached]
    
    compliance_rate = round(((len(resolved) - len([r for r in resolved if r.is_sla_breached])) / max(1, len(resolved))) * 100.0, 1) if resolved else 100.0
    
    # Category resolution averages
    cat_res_times: Dict[str, List[int]] = {}
    for r in resolved:
        if r.resolution_time_minutes:
            cat_res_times.setdefault(r.category, []).append(r.resolution_time_minutes)
    
    category_performance = []
    for cat, times in cat_res_times.items():
        avg_hrs = round((sum(times) / len(times)) / 60.0, 1)
        category_performance.append({
            "category": cat,
            "resolved_count": len(times),
            "avg_resolution_hours": avg_hrs
        })

    return {
        "period_days": days,
        "total_incidents": total,
        "resolved_count": len(resolved),
        "breached_count": len(breached),
        "compliance_rate": compliance_rate,
        "category_performance": category_performance
    }

@router.get("/export-csv")
def export_incidents_csv(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports filtered incident records as a standard CSV format.
    Excludes internal confidential hashes or server details.
    """
    query = db.query(Incident)

    if current_user.role == "Employee":
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == "Technician":
        query = query.filter(Incident.assigned_technician_id == current_user.id)

    if category and category != "All":
        query = query.filter(Incident.category == category)
    if priority and priority != "All":
        query = query.filter(Incident.priority == priority)
    if status and status != "All":
        query = query.filter(Incident.status == status)

    incidents = query.order_by(Incident.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Incident ID", "Title", "Category", "Priority", "Impact", "Urgency",
        "Status", "Reporter", "Assigned Technician", "SLA Deadline",
        "SLA Breached", "Resolution Time (mins)", "Created At", "Resolved At"
    ])

    for inc in incidents:
        writer.writerow([
            inc.incident_number,
            inc.title,
            inc.category,
            inc.priority,
            inc.impact,
            inc.urgency,
            inc.status,
            inc.reporter.full_name if inc.reporter else "Unknown",
            inc.assigned_technician.full_name if inc.assigned_technician else "Unassigned",
            inc.sla_deadline.strftime("%Y-%m-%d %H:%M:%S UTC") if inc.sla_deadline else "N/A",
            "YES" if inc.is_sla_breached else "NO",
            inc.resolution_time_minutes if inc.resolution_time_minutes else "N/A",
            inc.created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if inc.created_at else "N/A",
            inc.resolved_at.strftime("%Y-%m-%d %H:%M:%S UTC") if inc.resolved_at else "N/A",
        ])

    csv_data = output.getvalue()
    filename = f"ResolveAI_Incidents_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
