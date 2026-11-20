import asyncio
from types import SimpleNamespace

import pytest

from api.routers import auth, settings
from api.schemas.auth import (
    GoogleLoginBody,
    LoginBody,
    SignupCompleteBody,
)
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


@pytest.fixture
def fake_conn(monkeypatch):
    conn = object()

    async def fake_get_pool():
        return _FakePool(conn)

    monkeypatch.setattr(auth, "get_pool", fake_get_pool)
    monkeypatch.setattr(settings, "get_pool", fake_get_pool)
    return conn


@pytest.fixture
def user():
    return {
        "id": 7,
        "email": "user@example.com",
        "password_hash": "hashed-password",
        "role": "user",
    }


def _run(coro):
    return asyncio.run(coro)


def test_login_without_api_key_is_not_onboarded(fake_conn, user, monkeypatch):
    async def get_user(conn, email):
        return user

    async def has_key(conn, user_id):
        return False

    monkeypatch.setattr(auth.user_repo, "get_user_by_email", get_user)
    monkeypatch.setattr(auth.account_repo, "has_api_key_for_user", has_key)
    monkeypatch.setattr(auth, "verify_password", lambda plain, hashed: True)

    result = _run(auth.login(LoginBody(email=user["email"], password="pw")))

    assert result["onboarded"] is False
    assert result["has_api_key"] is False
    assert result["access_token"]
    assert "zernio_api_key_enc" not in result


def test_returning_user_who_abandoned_onboarding_is_not_onboarded(
    fake_conn, user, monkeypatch
):
    async def get_user(conn, email):
        return user

    async def has_key(conn, user_id):
        return False

    monkeypatch.setattr(auth.user_repo, "get_user_by_email", get_user)
    monkeypatch.setattr(auth.account_repo, "has_api_key_for_user", has_key)
    monkeypatch.setattr(auth, "verify_password", lambda plain, hashed: True)

    result = _run(auth.login(LoginBody(email=user["email"], password="pw")))

    assert result["onboarded"] is False


def test_login_with_saved_api_key_is_onboarded(fake_conn, user, monkeypatch):
    async def get_user(conn, email):
        return user

    async def has_key(conn, user_id):
        return True

    monkeypatch.setattr(auth.user_repo, "get_user_by_email", get_user)
    monkeypatch.setattr(auth.account_repo, "has_api_key_for_user", has_key)
    monkeypatch.setattr(auth, "verify_password", lambda plain, hashed: True)

    result = _run(auth.login(LoginBody(email=user["email"], password="pw")))

    assert result["onboarded"] is True
    assert result["has_api_key"] is True


def test_new_signup_has_no_api_key(fake_conn, monkeypatch):
    async def create_user(conn, email, password_hash):
        return {"id": 8, "email": email, "role": "user"}

    monkeypatch.setattr(auth, "verify_signup_token", lambda token: "new@example.com")
    monkeypatch.setattr(auth.user_repo, "create_user", create_user)
    monkeypatch.setattr(auth, "hash_password", lambda password: "hash")

    result = _run(
        auth.signup_complete(
            SignupCompleteBody(
                signup_token="token",
                password="password123",
                confirm_password="password123",
            )
        )
    )

    assert result["onboarded"] is False
    assert result["has_api_key"] is False


@pytest.mark.parametrize("is_new_user", [True, False])
def test_google_login_uses_api_key_status_not_new_user_flag(
    fake_conn, user, monkeypatch, is_new_user
):
    async def verify(credential):
        return {"email": user["email"]}

    async def get_or_create(conn, email, password_hash):
        return user, is_new_user

    async def has_key(conn, user_id):
        return False

    monkeypatch.setattr(auth.google_service, "verify_google_credential", verify)
    monkeypatch.setattr(
        auth.user_repo, "get_or_create_google_user", get_or_create
    )
    monkeypatch.setattr(auth.account_repo, "has_api_key_for_user", has_key)
    monkeypatch.setattr(auth, "hash_password", lambda password: "hash")

    result = _run(auth.google_login(GoogleLoginBody(credential="cred")))

    assert result["is_new_user"] is is_new_user
    assert result["onboarded"] is False
    assert result["has_api_key"] is False


def test_google_login_with_saved_api_key_is_onboarded(
    fake_conn, user, monkeypatch
):
    async def verify(credential):
        return {"email": user["email"]}

    async def get_or_create(conn, email, password_hash):
        return user, False

    async def has_key(conn, user_id):
        return True

    monkeypatch.setattr(auth.google_service, "verify_google_credential", verify)
    monkeypatch.setattr(
        auth.user_repo, "get_or_create_google_user", get_or_create
    )
    monkeypatch.setattr(auth.account_repo, "has_api_key_for_user", has_key)
    monkeypatch.setattr(auth, "hash_password", lambda password: "hash")

    result = _run(auth.google_login(GoogleLoginBody(credential="cred")))

    assert result["onboarded"] is True
    assert result["has_api_key"] is True


@pytest.mark.parametrize("has_key", [True, False])
def test_me_reports_consistent_api_key_status(
    fake_conn, user, monkeypatch, has_key
):
    async def has_api_key(conn, user_id):
        return has_key

    monkeypatch.setattr(auth.account_repo, "has_api_key_for_user", has_api_key)

    result = _run(auth.me(user=user))

    assert result["onboarded"] is has_key
    assert result["has_api_key"] is has_key


@pytest.mark.parametrize("sentinel", ["__pending__", "__key_only__"])
def test_settings_recognises_key_only_sentinel(
    fake_conn, user, monkeypatch, sentinel
):
    rows = [
        {
            "id": 1,
            "user_id": user["id"],
            "ig_username": sentinel,
            "zernio_account_id": "pending",
            "zernio_api_key_enc": "encrypted-key",
            "added_at": None,
        }
    ]

    async def get_accounts(conn, user_id):
        return rows

    async def get_remote_accounts(enc_key):
        return []

    async def get_connect_url(enc_key, redirect_uri, user_id):
        return "https://zernio.example/oauth"

    async def upsert(conn, user_id, ig_username, account_id, enc_key):
        return None

    monkeypatch.setattr(account_repo, "get_accounts_for_user", get_accounts)
    monkeypatch.setattr(account_repo, "upsert_account", upsert)
    monkeypatch.setattr(settings.zernio_service, "get_accounts", get_remote_accounts)
    monkeypatch.setattr(
        settings.zernio_service, "get_connect_url", get_connect_url
    )
    monkeypatch.setattr(settings.auth_service, "make_oauth_state", lambda uid: "state")

    request = SimpleNamespace(
        url=SimpleNamespace(scheme="https", netloc="api.hoop.test")
    )

    result = _run(settings.get_settings(request, user=user))

    assert result["has_api_key"] is True
    assert result["has_connected_account"] is False
    assert result["accounts"] == []
    assert "zernio_api_key_enc" not in result
