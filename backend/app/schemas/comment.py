from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserResponse

class CommentCreate(BaseModel):
    content: str
    is_internal: bool = False

class CommentResponse(BaseModel):
    id: int
    incident_id: int
    user_id: int
    content: str
    is_internal: bool
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True
