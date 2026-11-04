import pytest
from httpx import AsyncClient, ASGITransport
import time
from unittest.mock import patch, AsyncMock, MagicMock

from main import app
from services import redis_service
import pytest_asyncio

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app, client=("127.0.0.1", 12345))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio(loop_scope="session")
@patch("services.redis_service.is_redis_configured", return_value=True)
@patch("services.redis_service.expire", new_callable=AsyncMock)
@patch("services.redis_service.increment", new_callable=AsyncMock)
async def test_rate_limiting(mock_incr, mock_expire, mock_is_configured, client):
    # Simulate first 10 requests
    mock_incr.side_effect = list(range(1, 12)) # 1 to 11

    # Send 10 valid requests
    for i in range(10):
        resp = await client.post("/api/auth/login", json={"email": "test@test.com", "password": "password"})
        assert resp.status_code != 429

    # The 11th request should be blocked
    resp = await client.post("/api/auth/login", json={"email": "test@test.com", "password": "password"})
    assert resp.status_code == 429
    assert resp.headers["Retry-After"] == "60"
