from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.duplicate_detector import find_duplicate_incidents
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter(prefix="/duplicates", tags=["Duplicate Detection"])

class DuplicateCheckRequest(BaseModel):
    title: str
    description: str
    exclude_id: int | None = None

class DuplicateIncidentItem(BaseModel):
    id: int
    incident_number: str
    title: str
    category: str
    status: str
    priority: str
    similarity_score: float
    created_at: str

@router.post("/check", response_model=List[DuplicateIncidentItem])
def check_duplicate_incidents(
    payload: DuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes title and description against recent incidents using TF-IDF cosine similarity.
    Returns matched incidents above threshold to prevent duplicate ticket submissions.
    """
    duplicates = find_duplicate_incidents(
        title=payload.title,
        description=payload.description,
        db=db,
        exclude_id=payload.exclude_id
    )
    return duplicates
