"""
api/routers/webhook.py
======================
LAYER: Router — Inbound Zernio Webhook endpoint.
"""
import logging
from fastapi import APIRouter, HTTPException, Request

from config import ZERNIO_WEBHOOK_SECRET
from db import get_pool
from repositories import account_repo, message_repo

router = APIRouter(tags=["Webhook"])


@router.post("/webhook/zernio")
async def zernio_webhook(request: Request):
    """
    Receives inbound events (messages, account.connected) from Zernio.
    """
    # Validate webhook secret if configured
    if ZERNIO_WEBHOOK_SECRET:
        token = (
            request.headers.get("x-zernio-secret")
            or request.headers.get("x-webhook-secret")
            or request.headers.get("authorization", "").removeprefix("Bearer ")
        )
        if token != ZERNIO_WEBHOOK_SECRET:
            raise HTTPException(401, "Invalid webhook secret")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    print(f"[webhook] raw payload keys={list(payload.keys())} event={payload.get('event')}")

    event_type = payload.get("event")
    if event_type == "account.connected":
        acc = payload.get("account") or payload.get("data") or {}
        username = acc.get("username")
        account_id = acc.get("accountId") or acc.get("_id")
        if username and account_id:
            pool = await get_pool()
            async with pool.acquire() as conn:
                pending = await conn.fetchrow(
                    "SELECT user_id, zernio_api_key_enc FROM connected_ig_accounts WHERE ig_username = '__pending__' ORDER BY added_at DESC LIMIT 1"
                )
                if pending:
                    await account_repo.upsert_account(
                        conn, pending["user_id"], username, account_id, pending["zernio_api_key_enc"]
                    )
        return {"status": "ok", "event": "account.connected"}

    # Zernio webhook shape (message.received):
    msg = payload.get("message") or {}
    conv = payload.get("conversation") or {}

    print(f"[webhook] msg keys={list(msg.keys())}")
    print(f"[webhook] conv keys={list(conv.keys())}")
    print(f"[webhook] conv.id={conv.get('id')} conv.platformConversationId={conv.get('platformConversationId')}")
    print(f"[webhook] msg.id={msg.get('id')} msg.conversationId={msg.get('conversationId')} msg.direction={msg.get('direction')}")

    msg_id = msg.get("id")
    conv_id = conv.get("platformConversationId") or conv.get("id")
    print(f"[webhook] using conv_id={conv_id} (platformConversationId={conv.get('platformConversationId')} zernio_internal={conv.get('id')})")

    direction = msg.get("direction") or ("incoming" if event_type in ("message.received", "inbound") else "outgoing")
    text = msg.get("text") or msg.get("message") or msg.get("body") or msg.get("content") or ""
    sender = msg.get("sender") or {}
    sender_id = sender.get("id")
    sender_name = sender.get("name") or sender.get("username") or conv.get("participantName")

    raw_ts = msg.get("sentAt") or msg.get("createdAt") or msg.get("created_at") or msg.get("timestamp")
    if isinstance(raw_ts, (int, float)):
        ts_sec = raw_ts / 1000 if raw_ts > 1e10 else raw_ts
        created_at = str(int(ts_sec))
    elif raw_ts is not None:
        created_at = str(raw_ts)
    else:
        created_at = None

    if not msg_id or not conv_id:
        logging.warning(f"[webhook] ignored: msg_id={msg_id} conv_id={conv_id} full_msg={msg} full_conv={conv}")
        return {
            "status": "ignored",
            "reason": "missing id or conversationId",
            "msg_id": msg_id,
            "conv_id": conv_id,
            "msg_keys": list(msg.keys()),
            "conv_keys": list(conv.keys()),
        }

    pool = await get_pool()
    async with pool.acquire() as conn:
        print(f"[webhook] inserting msg_id={msg_id} conversation_id={conv_id} direction={direction} text={text[:40]!r}")
        await message_repo.upsert_message(
            conn,
            msg_id=str(msg_id),
            conversation_id=str(conv_id),
            sender_id=sender_id,
            sender_name=sender_name,
            message=text,
            direction=direction,
            created_at=created_at,
            platform="instagram",
        )

    return {"status": "ok"}
