#!/usr/bin/env python3
"""
setup_account_id.py
───────────────────
Fetches your connected Instagram account(s) from Zernio
and auto-writes ZERNIO_ACCOUNT_ID into your .env file.

Usage:
    1. Make sure ZERNIO_API_KEY is already in .env
    2. Run: python setup_account_id.py
"""
import os
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ZERNIO_API_KEY", "")
ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")

if not API_KEY or API_KEY == "sk_your_api_key_here":
    print("❌  ZERNIO_API_KEY is not set in .env. Open .env and paste your key first.")
    exit(1)

print(f"🔍  Fetching Instagram accounts from Zernio...")

try:
    r = httpx.get(
        "https://zernio.com/api/v1/accounts",
        headers={"Authorization": f"Bearer {API_KEY}"},
        params={"platform": "instagram"},
        timeout=15,
    )
    r.raise_for_status()
except httpx.HTTPStatusError as e:
    print(f"❌  Zernio API error {e.response.status_code}: {e.response.text}")
    exit(1)

data = r.json()
accounts = data.get("accounts", [])

if not accounts:
    print("⚠️  No Instagram accounts connected to your Zernio workspace.")
    print("    Go to https://zernio.com → Settings → Accounts → Add Instagram")
    exit(1)

print(f"\n✅  Found {len(accounts)} Instagram account(s):\n")
for i, a in enumerate(accounts):
    print(f"  [{i}] @{a.get('username', 'unknown')} → ID: {a['_id']}")

chosen = 0
if len(accounts) > 1:
    try:
        chosen = int(input(f"\nEnter the number to use [0-{len(accounts)-1}]: "))
    except (ValueError, KeyboardInterrupt):
        chosen = 0

selected = accounts[chosen]
account_id = selected["_id"]
username = selected.get("username", "?")

print(f"\n📌  Using @{username} (ID: {account_id})")

# Write to .env
with open(ENV_FILE, "r") as f:
    env_content = f.read()

if "ZERNIO_ACCOUNT_ID=" in env_content:
    env_content = re.sub(
        r"ZERNIO_ACCOUNT_ID=.*", f"ZERNIO_ACCOUNT_ID={account_id}", env_content
    )
else:
    env_content += f"\nZERNIO_ACCOUNT_ID={account_id}\n"

with open(ENV_FILE, "w") as f:
    f.write(env_content)

print(f"✅  ZERNIO_ACCOUNT_ID={account_id} written to .env")
print("\n🚀  You're ready! Start the API server with:")
print("    uvicorn main:app --reload --port 8000")
