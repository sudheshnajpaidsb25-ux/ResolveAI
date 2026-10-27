from datetime import datetime, timedelta
from app.models.technician import TechnicianProfile
from app.services.assignment_engine import score_technician_for_incident
from app.services.sla_engine import compute_sla_status
from app.models.incident import Incident

def test_technician_scoring_system():
    tech = TechnicianProfile(
        id=1,
        user_id=1,
        skills="Network, Cisco, VPN, Routing",
        categories="Network, Security",
        is_available=True,
        max_workload=8,
        current_workload=2
    )

    # Incident with matching network category and VPN keyword
    score, reason = score_technician_for_incident(
        tech=tech,
        category="Network",
        title="VPN Tunnel Timeout",
        description="Users cannot ping remote gateway via Cisco router",
        priority="Critical"
    )
    # Category (40) + Skills (15-30) + Workload (15) + Priority (10) >= 70
    assert score >= 70.0
    assert "Matched category 'Network'" in reason
    assert "vpn" in reason.lower() or "cisco" in reason.lower()

def test_sla_deadline_and_breach_calculation():
    now = datetime.utcnow()
    # Incident created 5 hours ago with 4-hour target resolution (Critical)
    past_created = now - timedelta(hours=5)
    deadline = past_created + timedelta(hours=4)

    inc = Incident(
        id=99,
        incident_number="INC-TEST-1",
        title="Test Critical Outage",
        description="Core switch down",
        category="Network",
        priority="Critical",
        status="In Progress",
        created_at=past_created,
        sla_deadline=deadline,
        is_sla_breached=False
    )

    status_info = compute_sla_status(inc)
    assert status_info.is_breached == True
    assert status_info.status == "BREACHED"
    assert status_info.remaining_minutes < 0
    assert status_info.elapsed_minutes >= 300.0  # 5 hours
