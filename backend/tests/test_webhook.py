import pytest
from httpx import AsyncClient, ASGITransport
import time
import hmac

from main import app
from db import get_pool
from repositories import user_repo, account_repo
from services.auth_service import hash_password
from crypto import encrypt_api_key

import pytest_asyncio
import os

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio(loop_scope="session")
async def test_webhook_secret(client):
    import api.routers.webhook
    api.routers.webhook.ZERNIO_WEBHOOK_SECRET = "mysecret"

    payload = {"event": "test"}

    resp1 = await client.post("/webhook/zernio", json=payload, headers={"x-webhook-secret": "wrong"})
    assert resp1.status_code == 401

    resp2 = await client.post("/webhook/zernio", json=payload, headers={"x-webhook-secret": "mysecret"})
    assert resp2.status_code == 200

@pytest.mark.asyncio(loop_scope="session")
async def test_webhook_race_condition(client):
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            await user_repo.create_user(conn, "user1@test.com", "hash")
        except Exception:
            pass
        user1 = await user_repo.get_user_by_email(conn, "user1@test.com")

        try:
            await user_repo.create_user(conn, "user2@test.com", "hash")
        except Exception:
            pass
        user2 = await user_repo.get_user_by_email(conn, "user2@test.com")

        # User 1 pending
        await account_repo.upsert_account(conn, user1["id"], "__pending__", "pending", encrypt_api_key("apikey1"))
        time.sleep(0.01) # to ensure order
        # User 2 pending
        await account_repo.upsert_account(conn, user2["id"], "__pending__", "pending", encrypt_api_key("apikey2"))

    # Simulate webhook arriving out of order for user 1 (using apikey1)
    payload = {
        "event": "account.connected",
        "account": {
            "username": "iguser1",
            "accountId": "igid1",
            "apiKey": "apikey1"
        }
    }

    import api.routers.webhook
    api.routers.webhook.ZERNIO_WEBHOOK_SECRET = "mysecret"

    resp = await client.post("/webhook/zernio", json=payload, headers={"x-webhook-secret": "mysecret"})
    assert resp.status_code == 200

    # Verify it linked to user1, not user2 (despite user2 being the most recent pending)
    async with pool.acquire() as conn:
        acc1 = await account_repo.get_accounts_for_user(conn, user1["id"])
        acc2 = await account_repo.get_accounts_for_user(conn, user2["id"])

        assert any(a["ig_username"] == "iguser1" for a in acc1)
        assert not any(a["ig_username"] == "iguser1" for a in acc2)
