from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse
from app.schemas.comment import CommentResponse
from app.schemas.activity import ActivityResponse
from app.schemas.sla import SLAStatusInfo
from app.schemas.ml import PredictResponse

class IncidentBase(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    impact: str = "Medium"
    urgency: str = "Medium"

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    impact: Optional[str] = None
    urgency: Optional[str] = None
    status: Optional[str] = None
    assigned_technician_id: Optional[int] = None
    resolution_notes: Optional[str] = None

class IncidentStatusChange(BaseModel):
    status: str
    resolution_notes: Optional[str] = None

class IncidentAssignOverride(BaseModel):
    technician_id: int
    reason: str

class IncidentResponse(IncidentBase):
    id: int
    incident_number: str
    status: str
    reporter_id: int
    assigned_technician_id: Optional[int] = None
    assignment_reason: Optional[str] = None
    reassignment_count: int
    sla_deadline: Optional[datetime] = None
    is_sla_breached: bool
    resolution_notes: Optional[str] = None
    resolution_time_minutes: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    reporter: Optional[UserResponse] = None
    assigned_technician: Optional[UserResponse] = None
    sla_status: Optional[SLAStatusInfo] = None
    prediction: Optional[PredictResponse] = None

    class Config:
        from_attributes = True

class IncidentDetailResponse(IncidentResponse):
    comments: List[CommentResponse] = []
    activities: List[ActivityResponse] = []
    similar_incidents: List[dict] = []

class IncidentFilterParams(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    technician_id: Optional[int] = None
    search: Optional[str] = None
    breached_only: Optional[bool] = None
    skip: int = 0
    limit: int = 50

class IncidentListResponse(BaseModel):
    total: int
    items: List[IncidentResponse]
    page: int
    page_size: int
