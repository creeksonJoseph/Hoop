import asyncio

import pytest

from api.routers import home
from repositories import account_repo


class _FakeAcquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakePool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        return _FakeAcquire(self.conn)


@pytest.mark.parametrize("sentinel", account_repo.SENTINEL_USERNAMES)
def test_key_only_user_gets_instagram_connection_notification(
    monkeypatch, sentinel
):
    conn = object()

    async def get_pool():
        return _FakePool(conn)

    async def get_active_account(conn, user_id, requested=None):
        return None

    async def list_dms(conn, user_id, account_username=None):
        return []

    async def get_accounts(conn, user_id):
        return [{"ig_username": sentinel}]

    monkeypatch.setattr(home, "get_pool", get_pool)
    monkeypatch.setattr(account_repo, "get_active_account", get_active_account)
    monkeypatch.setattr(
        account_repo, "list_dm_usernames_with_session_counts", list_dms
    )
    monkeypatch.setattr(account_repo, "get_accounts_for_user", get_accounts)

    result = asyncio.run(
        home.list_dms(
            x_hoop_instagram_account=None,
            user={"id": 1, "email": "user@example.com"},
        )
    )

    assert result["has_real_account"] is False
    assert result["dms"] == []


def test_real_instagram_account_keeps_dashboard_connected(monkeypatch):
    conn = object()

    async def get_pool():
        return _FakePool(conn)

    async def get_active_account(conn, user_id, requested=None):
        return {"ig_username": "real_account"}

    async def list_dms(conn, user_id, account_username=None):
        return []

    async def get_accounts(conn, user_id):
        return [{"ig_username": "real_account"}]

    monkeypatch.setattr(home, "get_pool", get_pool)
    monkeypatch.setattr(account_repo, "get_active_account", get_active_account)
    monkeypatch.setattr(
        account_repo, "list_dm_usernames_with_session_counts", list_dms
    )
    monkeypatch.setattr(account_repo, "get_accounts_for_user", get_accounts)

    result = asyncio.run(
        home.list_dms(
            x_hoop_instagram_account=None,
            user={"id": 1, "email": "user@example.com"},
        )
    )

    assert result["has_real_account"] is True
