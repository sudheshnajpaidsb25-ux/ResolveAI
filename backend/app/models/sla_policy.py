from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id = Column(Integer, primary_key=True, index=True)
    priority = Column(String(50), unique=True, index=True, nullable=False)  # Critical, High, Medium, Low
    target_resolution_hours = Column(Float, nullable=False)
    warning_threshold_percent = Column(Float, default=75.0)
    critical_threshold_percent = Column(Float, default=90.0)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    incidents = relationship("Incident", back_populates="sla_policy")
