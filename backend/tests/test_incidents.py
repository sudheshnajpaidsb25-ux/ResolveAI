def test_create_and_get_incident(client, emp_token):
    # Employee creates incident
    payload = {
        "title": "VPN Gateway Flapping on Floor 4",
        "description": "Users cannot establish stable IPSec connection to company VPN.",
        "category": "Network",
        "priority": "High",
        "impact": "High",
        "urgency": "Medium"
    }
    create_res = client.post(
        "/api/incidents",
        json=payload,
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["incident_number"].startswith("INC-")
    assert created_data["status"] == "Assigned"
    assert created_data["assigned_technician_id"] is not None
    assert "Network" in created_data["assignment_reason"]
    assert created_data["sla_deadline"] is not None

    inc_id = created_data["id"]

    # Get incident detail
    detail_res = client.get(
        f"/api/incidents/{inc_id}",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == inc_id
    assert "sla_status" in detail_data
    assert "prediction" in detail_data

def test_technician_status_update(client, tech_token):
    # Create incident first with tech token
    create_res = client.post(
        "/api/incidents",
        json={
            "title": "Switch loop detection",
            "description": "Spanning tree protocol blocked port 12",
            "category": "Network",
            "priority": "Medium",
            "impact": "Low",
            "urgency": "Low"
        },
        headers={"Authorization": f"Bearer {tech_token}"}
    )
    inc_id = create_res.json()["id"]

    # Tech marks in progress
    stat_res = client.post(
        f"/api/incidents/{inc_id}/status",
        json={"status": "In Progress"},
        headers={"Authorization": f"Bearer {tech_token}"}
    )
    assert stat_res.status_code == 200
    assert stat_res.json()["status"] == "In Progress"

    # Tech resolves incident
    res_res = client.post(
        f"/api/incidents/{inc_id}/status",
        json={"status": "Resolved", "resolution_notes": "Unplugged redundant cable, STP stabilized."},
        headers={"Authorization": f"Bearer {tech_token}"}
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "Resolved"
    assert res_res.json()["resolution_notes"] == "Unplugged redundant cable, STP stabilized."
