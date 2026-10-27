from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PredictionRecord(Base):
    __tablename__ = "prediction_records"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    breach_probability = Column(Float, nullable=False)  # 0.0 to 100.0
    risk_level = Column(String(50), nullable=False)     # Low, Medium, High
    top_factors = Column(Text, nullable=True)          # JSON array of factors & importance
    model_version = Column(String(50), default="v1.0")
    is_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationship
    incident = relationship("Incident", back_populates="predictions")
