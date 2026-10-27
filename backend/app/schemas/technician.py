from pydantic import BaseModel
from typing import Optional
from app.schemas.user import UserResponse

class TechnicianProfileBase(BaseModel):
    skills: str
    categories: str
    is_available: bool = True
    max_workload: int = 8

class TechnicianProfileUpdate(BaseModel):
    skills: Optional[str] = None
    categories: Optional[str] = None
    is_available: Optional[bool] = None
    max_workload: Optional[int] = None

class TechnicianResponse(TechnicianProfileBase):
    id: int
    user_id: int
    current_workload: int
    total_resolved: int
    average_rating: float
    user: UserResponse

    class Config:
        from_attributes = True
