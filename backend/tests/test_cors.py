import pytest
from httpx import AsyncClient, ASGITransport
from main import app
import pytest_asyncio

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio(loop_scope="session")
async def test_cors_configuration(client):
    # Valid origins
    resp1 = await client.options("/api/health", headers={
        "Origin": "https://hooop.tech",
        "Access-Control-Request-Method": "GET"
    })
    assert resp1.headers.get("access-control-allow-origin") == "https://hooop.tech"

    # Invalid suffix origin
    resp2 = await client.options("/api/health", headers={
        "Origin": "https://evilhooop.tech",
        "Access-Control-Request-Method": "GET"
    })
    assert "access-control-allow-origin" not in resp2.headers

    # Another invalid suffix origin
    resp3 = await client.options("/api/health", headers={
        "Origin": "https://evilvercel.app",
        "Access-Control-Request-Method": "GET"
    })
    assert "access-control-allow-origin" not in resp3.headers
