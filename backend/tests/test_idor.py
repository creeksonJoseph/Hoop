import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from db import get_pool
from repositories import user_repo, account_repo, session_repo, message_repo
from services.auth_service import hash_password, create_jwt
from crypto import encrypt_api_key
import pytest_asyncio

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio(loop_scope="session")
async def test_cross_account_contamination(client):
    pool = await get_pool()
    async with pool.acquire() as conn:
        try:
            await user_repo.create_user(conn, "testidor@test.com", "hash")
        except:
            pass
        user = await user_repo.get_user_by_email(conn, "testidor@test.com")

        # User has two IG accounts
        await account_repo.upsert_account(conn, user["id"], "acc1", "acc_id1", encrypt_api_key("apikey1"))
        await account_repo.upsert_account(conn, user["id"], "acc2", "acc_id2", encrypt_api_key("apikey2"))

        # Add DM for acc1
        await account_repo.add_tracked_dm(conn, user["id"], "target_user", "acc1")
        # Add DM for acc2
        await account_repo.add_tracked_dm(conn, user["id"], "target_user", "acc2")

        # Add messages for acc1
        await message_repo.upsert_conversation(conn, "conv1", "target_user", "Target User", account_username="acc1")
        await message_repo.upsert_message(
            conn, msg_id="m1", conversation_id="conv1", sender_id="s1", sender_name="target_user",
            message="msg for acc1", direction="incoming", created_at=None, account_username="acc1"
        )

        # Add messages for acc2
        await message_repo.upsert_conversation(conn, "conv2", "target_user", "Target User", account_username="acc2")
        await message_repo.upsert_message(
            conn, msg_id="m2", conversation_id="conv2", sender_id="s2", sender_name="target_user",
            message="msg for acc2", direction="incoming", created_at=None, account_username="acc2"
        )

    # Now make request as user viewing acc1's DMs
    token = create_jwt(user["id"], user["email"])

    # We patch Zernio client to not make actual requests and return what's in DB
    import services.zernio.client
    original_get = services.zernio.client.get
    async def mock_get(*args, **kwargs):
        return {"data": [], "pagination": {"hasMore": False}}
    services.zernio.client.get = mock_get

    try:
        resp1 = await client.get("/api/messages/?username=target_user", headers={
            "Authorization": f"Bearer {token}",
            "x-hoop-instagram-account": "acc1"
        })

        resp2 = await client.get("/api/messages/?username=target_user", headers={
            "Authorization": f"Bearer {token}",
            "x-hoop-instagram-account": "acc2"
        })

        data1 = resp1.json()
        data2 = resp2.json()

        # Should only see acc1's messages
        assert len(data1["messages"]) == 1
        assert data1["messages"][0]["message"] == "msg for acc1"

        # Should only see acc2's messages
        assert len(data2["messages"]) == 1
        assert data2["messages"][0]["message"] == "msg for acc2"
    finally:
        services.zernio.client.get = original_get
