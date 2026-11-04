import pytest
import os
import asyncio

os.environ["DATABASE_URL"] = "postgres://hoop:hoop@localhost:5432/hoop"
os.environ["JWT_SECRET"] = "testsecret"
os.environ["WINGMAN_SECRET"] = "testsecret"
os.environ["APP_MASTER_KEY"] = "1R_hNzvC8riCZaJuaZPNtws0FZvUiXNSgTo4Yg7-0U4="
os.environ["FRONTEND_URL"] = "http://localhost:5173"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
