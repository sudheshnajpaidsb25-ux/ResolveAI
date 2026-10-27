from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.technician import TechnicianProfile
from app.models.user import User
from app.schemas.technician import TechnicianResponse, TechnicianProfileUpdate
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/technicians", tags=["Technicians"])

@router.get("", response_model=List[TechnicianResponse])
def get_technicians(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    techs = (
        db.query(TechnicianProfile)
        .join(User)
        .filter(User.is_active == True)
        .all()
    )
    return techs

@router.put("/{id}", response_model=TechnicianResponse)
def update_technician_profile(
    id: int,
    payload: TechnicianProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Technician"]))
):
    profile = db.query(TechnicianProfile).filter(TechnicianProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Technician profile not found")

    # If Technician, ensure updating own profile
    if current_user.role == "Technician" and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update other technicians")

    if payload.skills is not None:
        profile.skills = payload.skills
    if payload.categories is not None:
        profile.categories = payload.categories
    if payload.is_available is not None:
        profile.is_available = payload.is_available
    if payload.max_workload is not None and current_user.role == "Admin":
        profile.max_workload = payload.max_workload

    db.commit()
    db.refresh(profile)
    return profile

@router.post("/{id}/toggle-availability", response_model=TechnicianResponse)
def toggle_availability(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "Technician"]))
):
    profile = db.query(TechnicianProfile).filter(TechnicianProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Technician profile not found")
    if current_user.role == "Technician" and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to change another technician's status")

    profile.is_available = not profile.is_available
    db.commit()
    db.refresh(profile)
    return profile
