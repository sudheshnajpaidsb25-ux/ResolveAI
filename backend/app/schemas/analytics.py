from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class PriorityCount(BaseModel):
    priority: str
    count: int

class CategoryCount(BaseModel):
    category: str
    count: int

class TrendDataPoint(BaseModel):
    date: str
    created: int
    resolved: int
    breached: int

class TechnicianWorkloadMetric(BaseModel):
    technician_id: int
    name: str
    active_incidents: int
    resolved_incidents: int
    max_workload: int
    avg_resolution_hours: float
    sla_compliance_rate: float

class BreachRiskDistribution(BaseModel):
    low_risk: int
    medium_risk: int
    high_risk: int

class DashboardMetrics(BaseModel):
    total_incidents: int
    open_incidents: int
    in_progress_incidents: int
    resolved_incidents: int
    critical_incidents: int
    active_sla_breaches: int
    high_risk_incidents: int
    sla_compliance_rate: float  # Percentage: e.g. 94.2%
    avg_resolution_hours: float
    
    priority_breakdown: List[PriorityCount]
    category_breakdown: List[CategoryCount]
    trend_data: List[TrendDataPoint]
    technician_metrics: List[TechnicianWorkloadMetric]
    risk_distribution: BreachRiskDistribution
