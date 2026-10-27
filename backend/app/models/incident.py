from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g. INC-1001
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Hardware, Network, Software, Database, Security, Cloud, etc.
    priority = Column(String(50), nullable=False, index=True)   # Low, Medium, High, Critical
    impact = Column(String(50), default="Medium")              # Low, Medium, High
    urgency = Column(String(50), default="Medium")             # Low, Medium, High
    status = Column(String(50), nullable=False, default="Open", index=True)  # Open, Assigned, In Progress, On Hold, Resolved, Closed

    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assignment_reason = Column(Text, nullable=True)
    reassignment_count = Column(Integer, default=0)

    sla_policy_id = Column(Integer, ForeignKey("sla_policies.id"), nullable=True)
    sla_deadline = Column(DateTime, nullable=True)
    is_sla_breached = Column(Boolean, default=False, index=True)
    breach_notified = Column(Boolean, default=False)
    warning_notified = Column(Boolean, default=False)
    critical_warning_notified = Column(Boolean, default=False)

    resolution_notes = Column(Text, nullable=True)
    resolution_time_minutes = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    reporter = relationship("User", back_populates="reported_incidents", foreign_keys=[reporter_id])
    assigned_technician = relationship("User", back_populates="assigned_incidents", foreign_keys=[assigned_technician_id])
    sla_policy = relationship("SLAPolicy", back_populates="incidents")
    comments = relationship("IncidentComment", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentComment.created_at.asc()")
    activities = relationship("IncidentActivity", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentActivity.created_at.desc()")
    predictions = relationship("PredictionRecord", back_populates="incident", cascade="all, delete-orphan", order_by="PredictionRecord.created_at.desc()")
