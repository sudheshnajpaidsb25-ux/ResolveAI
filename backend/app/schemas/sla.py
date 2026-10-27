from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SLAPolicyBase(BaseModel):
    priority: str
    target_resolution_hours: float
    warning_threshold_percent: float = 75.0
    critical_threshold_percent: float = 90.0
    description: Optional[str] = None

class SLAPolicyCreate(SLAPolicyBase):
    pass

class SLAPolicyUpdate(BaseModel):
    target_resolution_hours: Optional[float] = None
    warning_threshold_percent: Optional[float] = None
    critical_threshold_percent: Optional[float] = None
    description: Optional[str] = None

class SLAPolicyResponse(SLAPolicyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SLAStatusInfo(BaseModel):
    priority: str
    target_hours: float
    deadline: Optional[datetime] = None
    elapsed_minutes: float
    remaining_minutes: float
    percentage_consumed: float
    status: str  # NORMAL, WARNING, CRITICAL_WARNING, BREACHED, MET
    is_breached: bool
