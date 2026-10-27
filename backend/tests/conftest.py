import pytest
import os
import sys

# Ensure backend root is on path
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.technician import TechnicianProfile
from app.models.sla_policy import SLAPolicy
from app.services.auth_service import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite:///./test_resolveai.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    # Pre-populate SLA policies and test users
    db = TestingSessionLocal()
    policies = [
        SLAPolicy(priority="Critical", target_resolution_hours=4.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0),
        SLAPolicy(priority="High", target_resolution_hours=8.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0),
        SLAPolicy(priority="Medium", target_resolution_hours=24.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0),
        SLAPolicy(priority="Low", target_resolution_hours=72.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0),
    ]
    db.add_all(policies)

    # Admin
    admin = User(
        email="testadmin@resolveai.com",
        full_name="Test Admin",
        hashed_password=get_password_hash("Password123"),
        role="Admin",
        is_active=True
    )
    # Tech
    tech = User(
        email="testtech@resolveai.com",
        full_name="Test Technician",
        hashed_password=get_password_hash("Password123"),
        role="Technician",
        is_active=True
    )
    # Employee
    emp = User(
        email="testemp@resolveai.com",
        full_name="Test Employee",
        hashed_password=get_password_hash("Password123"),
        role="Employee",
        is_active=True
    )
    db.add_all([admin, tech, emp])
    db.commit()
    db.refresh(tech)

    tp = TechnicianProfile(
        user_id=tech.id,
        skills="Network, VPN, Cisco, Routing, Firewalls",
        categories="Network, Security, Hardware",
        is_available=True,
        max_workload=8,
        current_workload=0
    )
    db.add(tp)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_resolveai.db"):
        try:
            os.remove("./test_resolveai.db")
        except Exception:
            pass

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_token():
    return create_access_token({"sub": "testadmin@resolveai.com", "role": "Admin", "user_id": 1})

@pytest.fixture
def tech_token():
    return create_access_token({"sub": "testtech@resolveai.com", "role": "Technician", "user_id": 2})

@pytest.fixture
def emp_token():
    return create_access_token({"sub": "testemp@resolveai.com", "role": "Employee", "user_id": 3})
