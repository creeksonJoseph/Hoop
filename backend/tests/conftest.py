"""Test bootstrap for the Hoop backend.

Set the minimum environment required by config.py before importing app modules.
No real database connection is made; repository/DB calls are mocked per test.
"""
import os
import pathlib
import sys

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault(
    "DATABASE_URL", "postgresql://test:test@localhost:5432/hoop_test"
)
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("WINGMAN_SECRET", "test-wingman-secret")
