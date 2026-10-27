from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserResponse

class ActivityResponse(BaseModel):
    id: int
    incident_id: int
    user_id: Optional[int] = None
    action: str
    details: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
