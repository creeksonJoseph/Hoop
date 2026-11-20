import asyncio

import pytest

from repositories import account_repo


class _RecordingConn:
    def __init__(self, value=None, row=None):
        self.value = value
        self.row = row
        self.query = None
        self.args = None

    async def fetchval(self, query, *args):
        self.query = query
        self.args = args
        return self.value

    async def fetchrow(self, query, *args):
        self.query = query
        self.args = args
        return self.row


def test_has_api_key_queries_encrypted_key_presence():
    conn = _RecordingConn(value=True)

    assert asyncio.run(account_repo.has_api_key_for_user(conn, 42)) is True
    assert "zernio_api_key_enc" in conn.query
    assert "zernio_api_key_enc IS NOT NULL" in conn.query
    assert conn.args == (42,)


def test_has_api_key_is_false_when_no_key_row_exists():
    conn = _RecordingConn(value=False)

    assert asyncio.run(account_repo.has_api_key_for_user(conn, 42)) is False


def test_active_account_query_excludes_key_only_sentinels():
    conn = _RecordingConn(row={"ig_username": "real_account"})

    account = asyncio.run(account_repo.get_active_account(conn, 42))

    assert account["ig_username"] == "real_account"
    assert "ig_username != ALL" in conn.query
    assert list(account_repo.SENTINEL_USERNAMES) == conn.args[1]


@pytest.mark.parametrize("sentinel", account_repo.SENTINEL_USERNAMES)
def test_requested_sentinel_is_not_returned_as_active_account(
    monkeypatch, sentinel
):
    async def get_account(conn, user_id, ig_username):
        return {"ig_username": sentinel}

    monkeypatch.setattr(account_repo, "get_account", get_account)
    conn = _RecordingConn()

    account = asyncio.run(
        account_repo.get_active_account(conn, 42, sentinel)
    )

    assert account is None
