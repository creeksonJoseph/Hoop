import pytest
from httpx import AsyncClient, ASGITransport
import time

from main import app
from db import get_pool
from repositories import user_repo
from services.auth_service import hash_password
import asyncio

import pytest_asyncio

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio(loop_scope="session")
async def test_login_timing_attack(client):
    # Test that login response time is similar for existing and non-existing users

    # 1. Create a user
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            await user_repo.create_user(conn, "existing@test.com", hash_password("password123"))
        except Exception:
            pass # Ignore if already exists

    # Time for non-existing user
    start_time = time.time()
    resp1 = await client.post("/api/auth/login", json={"email": "nonexisting@test.com", "password": "password123"})
    time_non_existing = time.time() - start_time

    # Time for existing user (wrong password)
    start_time = time.time()
    resp2 = await client.post("/api/auth/login", json={"email": "existing@test.com", "password": "wrongpassword"})
    time_existing = time.time() - start_time

    assert resp1.status_code == 401
    assert resp2.status_code == 401
    assert resp1.json()["detail"] == "Incorrect email or password."
    assert resp2.json()["detail"] == "Incorrect email or password."

    # The time difference should be minimal (less than 0.2s is a reasonable threshold for hashing)
    assert abs(time_non_existing - time_existing) < 0.2
