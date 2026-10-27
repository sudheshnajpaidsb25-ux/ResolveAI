def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "testadmin@resolveai.com",
        "password": "Password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "Admin"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "email": "testadmin@resolveai.com",
        "password": "WrongPassword"
    })
    assert res.status_code == 401

def test_get_current_user_profile(client, admin_token):
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "testadmin@resolveai.com"
