from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.incident import Incident
from app.models.technician import TechnicianProfile
from app.models.user import User
from app.schemas.analytics import (
    DashboardMetrics, PriorityCount, CategoryCount, TrendDataPoint,
    TechnicianWorkloadMetric, BreachRiskDistribution
)
from app.services.auth_service import get_current_user
from app.services.sla_engine import compute_sla_status

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=DashboardMetrics)
def get_dashboard_metrics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident)

    # Scoping by role
    if current_user.role == "Employee":
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == "Technician":
        query = query.filter(Incident.assigned_technician_id == current_user.id)

    total_incidents = query.count()
    open_incidents = query.filter(Incident.status.in_(["Open", "Assigned"])).count()
    in_prog_incidents = query.filter(Incident.status == "In Progress").count()
    resolved_incidents = query.filter(Incident.status.in_(["Resolved", "Closed"])).count()
    critical_incidents = query.filter(Incident.priority == "Critical", Incident.status.notin_(["Resolved", "Closed"])).count()

    # Active SLA Breaches
    active_breaches = query.filter(
        Incident.is_sla_breached == True,
        Incident.status.notin_(["Resolved", "Closed"])
    ).count()

    # Average Resolution Time (in hours)
    resolved_list = query.filter(
        Incident.status.in_(["Resolved", "Closed"]),
        Incident.resolution_time_minutes != None
    ).all()
    
    if resolved_list:
        total_res_minutes = sum(inc.resolution_time_minutes for inc in resolved_list)
        avg_resolution_hours = round((total_res_minutes / len(resolved_list)) / 60.0, 1)
        breached_resolved = sum(1 for inc in resolved_list if inc.is_sla_breached)
        sla_compliance_rate = round(((len(resolved_list) - breached_resolved) / len(resolved_list)) * 100.0, 1)
    else:
        avg_resolution_hours = 0.0
        sla_compliance_rate = 100.0

    # Priority breakdown
    prio_counts = (
        query.with_entities(Incident.priority, func.count(Incident.id))
        .group_by(Incident.priority)
        .all()
    )
    priority_order = ["Critical", "High", "Medium", "Low"]
    prio_map = {p: c for p, c in prio_counts}
    priority_breakdown = [
        PriorityCount(priority=p, count=prio_map.get(p, 0))
        for p in priority_order
    ]

    # Category breakdown
    cat_counts = (
        query.with_entities(Incident.category, func.count(Incident.id))
        .group_by(Incident.category)
        .all()
    )
    category_breakdown = [
        CategoryCount(category=c, count=cnt)
        for c, cnt in sorted(cat_counts, key=lambda x: x[1], reverse=True)
    ]

    # Trends over the last 7 days
    now = datetime.utcnow()
    trend_data = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_start = datetime(day_date.year, day_date.month, day_date.day)
        day_end = day_start + timedelta(days=1)
        
        created_c = query.filter(Incident.created_at >= day_start, Incident.created_at < day_end).count()
        resolved_c = query.filter(Incident.resolved_at >= day_start, Incident.resolved_at < day_end).count()
        breached_c = query.filter(Incident.is_sla_breached == True, Incident.created_at >= day_start, Incident.created_at < day_end).count()

        trend_data.append(TrendDataPoint(
            date=day_date.strftime("%b %d"),
            created=created_c,
            resolved=resolved_c,
            breached=breached_c
        ))

    # Technician Workload & Performance
    tech_profiles = db.query(TechnicianProfile).join(User).filter(User.is_active == True).all()
    tech_metrics = []
    for tp in tech_profiles:
        tech_resolved = db.query(Incident).filter(
            Incident.assigned_technician_id == tp.user_id,
            Incident.status.in_(["Resolved", "Closed"])
        ).all()
        
        tech_avg_hours = 0.0
        tech_compliance = 100.0
        if tech_resolved:
            valid_res = [r for r in tech_resolved if r.resolution_time_minutes is not None]
            if valid_res:
                tech_avg_hours = round(sum(r.resolution_time_minutes for r in valid_res) / len(valid_res) / 60.0, 1)
            tech_breaches = sum(1 for r in tech_resolved if r.is_sla_breached)
            tech_compliance = round(((len(tech_resolved) - tech_breaches) / len(tech_resolved)) * 100.0, 1)

        tech_metrics.append(TechnicianWorkloadMetric(
            technician_id=tp.user_id,
            name=tp.user.full_name,
            active_incidents=tp.current_workload,
            resolved_incidents=tp.total_resolved,
            max_workload=tp.max_workload,
            avg_resolution_hours=tech_avg_hours,
            sla_compliance_rate=tech_compliance
        ))

    # Breach Risk Distribution across active tickets
    open_tickets = query.filter(Incident.status.notin_(["Resolved", "Closed"])).all()
    low_r = 0
    med_r = 0
    high_r = 0
    for t in open_tickets:
        sla_info = compute_sla_status(t, db)
        if sla_info.is_breached or sla_info.percentage_consumed >= 80.0 or t.priority == "Critical":
            high_r += 1
        elif sla_info.percentage_consumed >= 45.0 or t.priority == "High":
            med_r += 1
        else:
            low_r += 1

    return DashboardMetrics(
        total_incidents=total_incidents,
        open_incidents=open_incidents,
        in_progress_incidents=in_prog_incidents,
        resolved_incidents=resolved_incidents,
        critical_incidents=critical_incidents,
        active_sla_breaches=active_breaches,
        high_risk_incidents=high_r,
        sla_compliance_rate=sla_compliance_rate,
        avg_resolution_hours=avg_resolution_hours,
        priority_breakdown=priority_breakdown,
        category_breakdown=category_breakdown,
        trend_data=trend_data,
        technician_metrics=tech_metrics,
        risk_distribution=BreachRiskDistribution(
            low_risk=low_r,
            medium_risk=med_r,
            high_risk=high_r
        )
    )
