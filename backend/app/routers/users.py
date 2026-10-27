from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.technician import TechnicianProfile
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.services.auth_service import get_current_user, require_role, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    return query.order_by(User.id.asc()).all()

@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        department=payload.department or "General",
        phone=payload.phone,
        is_active=payload.is_active if payload.is_active is not None else True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if user.role == "Technician":
        profile = TechnicianProfile(
            user_id=user.id,
            skills="General IT, Network, Hardware",
            categories="Network, Software, Hardware",
            is_available=True,
            max_workload=8,
            current_workload=0
        )
        db.add(profile)
        db.commit()

    return user

@router.get("/{id}", response_model=UserResponse)
def get_user_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "Admin" and current_user.id != id:
        raise HTTPException(status_code=403, detail="Not authorized to view this user profile")
    
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "Admin" and current_user.id != id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.department is not None:
        user.department = payload.department
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)
    
    # Only Admin can alter role and active status
    if current_user.role == "Admin":
        if payload.role is not None:
            user.role = payload.role
        if payload.is_active is not None:
            user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user

@router.put("/{id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate own admin account")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
