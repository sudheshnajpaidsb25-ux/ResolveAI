from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class TechnicianProfile(Base):
    __tablename__ = "technician_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    skills = Column(String(500), default="General IT")  # Comma-separated: "Network, Cisco, VPN, Firewalls"
    categories = Column(String(500), default="Network, Software, Hardware")  # Supported categories
    is_available = Column(Boolean, default=True)
    max_workload = Column(Integer, default=8)
    current_workload = Column(Integer, default=0)
    total_resolved = Column(Integer, default=0)
    average_rating = Column(Float, default=4.8)

    # Relationship
    user = relationship("User", back_populates="technician_profile")
