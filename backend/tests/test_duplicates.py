def test_duplicate_incident_detection(client, emp_token):
    # Create first ticket
    client.post(
        "/api/incidents",
        json={
            "title": "PostgreSQL database memory leak on replica 3",
            "description": "Patroni replica memory usage is at 98 percent and crashing periodically.",
            "category": "Database",
            "priority": "High"
        },
        headers={"Authorization": f"Bearer {emp_token}"}
    )

    # Check for duplicates with very similar text
    res = client.post(
        "/api/duplicates/check",
        json={
            "title": "PostgreSQL replica memory leak crashing",
            "description": "Database replica 3 memory usage high patroni crashing periodically"
        },
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert res.status_code == 200
    dups = res.json()
    assert len(dups) > 0
    assert dups[0]["similarity_score"] > 35.0
