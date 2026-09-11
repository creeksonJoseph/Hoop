"""
api/routers/webhook.py
======================
LAYER: Router — Inbound Zernio Webhook endpoint.
Handles:
  1. account.connected -> link Instagram account to user
  2. message.received / inbound -> store incoming message from crush in DB
  3. message.sent / message.echo / outbound -> store native Instagram reply from owner in DB
"""
import datetime
import logging
from fastapi import APIRouter, HTTPException, Request

from config import ZERNIO_WEBHOOK_SECRET
from db import get_pool
from repositories import account_repo, message_repo

router = APIRouter(tags=["Webhook"])


@router.post("/webhook/zernio")
async def zernio_webhook(request: Request):
    """
    Receives inbound events (messages, account.connected, message echoes) from Zernio.
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

    event_type = payload.get("event") or payload.get("type") or ""
    print(f"[webhook] raw payload keys={list(payload.keys())} event={event_type}")

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

    # Extract message object
    msg = payload.get("message")
    if not isinstance(msg, dict):
        data = payload.get("data")
        if isinstance(data, dict):
            msg = data.get("message") if isinstance(data.get("message"), dict) else data
        else:
            msg = {}

    if not msg and "id" in payload and ("text" in payload or "message" in payload or "direction" in payload):
        msg = payload

    # Extract conversation object
    conv = payload.get("conversation")
    if not isinstance(conv, dict):
        data = payload.get("data")
        if isinstance(data, dict) and isinstance(data.get("conversation"), dict):
            conv = data["conversation"]
        else:
            conv = {}

    msg_id = msg.get("id") or msg.get("message_id") or payload.get("id")
    raw_conv_id = (
        conv.get("platformConversationId")
        or conv.get("id")
        or msg.get("conversationId")
        or msg.get("conversation_id")
        or payload.get("conversationId")
    )

    if not msg_id or not raw_conv_id:
        logging.warning(f"[webhook] ignored: msg_id={msg_id} conv_id={raw_conv_id} payload={payload}")
        return {
            "status": "ignored",
            "reason": "missing msg_id or conversationId",
            "msg_id": msg_id,
            "conv_id": raw_conv_id,
        }

    # Determine direction: "outgoing" (native reply / echo / sent) vs "incoming" (received from crush)
    raw_dir = str(msg.get("direction") or payload.get("direction") or "").lower()
    is_from_me = bool(msg.get("isFromMe") or msg.get("is_from_me") or msg.get("fromMe") or payload.get("isFromMe"))

    if raw_dir in ("outbound", "outgoing", "sent", "echo") or is_from_me:
        direction = "outgoing"
    elif raw_dir in ("inbound", "incoming", "received"):
        direction = "incoming"
    elif event_type in ("message.sent", "message.echo", "message_sent", "outbound", "sent", "echo"):
        direction = "outgoing"
    elif event_type in ("message.received", "message_received", "inbound", "received"):
        direction = "incoming"
    else:
        direction = "outgoing" if is_from_me else "incoming"

    text = msg.get("text") or msg.get("message") or msg.get("body") or msg.get("content") or ""
    sender = msg.get("sender") or {}
    sender_id = sender.get("id")
    sender_name = sender.get("name") or sender.get("username") or conv.get("participantName")

    raw_ts = msg.get("sentAt") or msg.get("createdAt") or msg.get("created_at") or msg.get("timestamp") or payload.get("timestamp")
    if isinstance(raw_ts, (int, float)):
        ts_sec = raw_ts / 1000 if raw_ts > 1e10 else raw_ts
        created_at = str(int(ts_sec))
    elif raw_ts is not None:
        created_at = str(raw_ts)
    else:
        created_at = datetime.datetime.utcnow().isoformat() + "Z"

    p_data = conv.get("instagramProfile") or conv.get("participant") or {}
    participant_username = (
        conv.get("participantUsername")
        or conv.get("participant_username")
        or p_data.get("username")
        or (sender_name if direction == "incoming" else None)
    )

    pool = await get_pool()
    async with pool.acquire() as conn:
        # Resolve DB conversation_id: match existing conversation row if available
        final_conv_id = str(raw_conv_id)
        if participant_username:
            conv_rec = await message_repo.get_conversation_by_participant(conn, participant_username)
            if conv_rec and conv_rec.get("conversation_id"):
                final_conv_id = conv_rec["conversation_id"]

        print(f"[webhook] inserting msg_id={msg_id} conversation_id={final_conv_id} direction={direction} text={text[:40]!r}")
        await message_repo.upsert_message(
            conn,
            msg_id=str(msg_id),
            conversation_id=final_conv_id,
            sender_id=sender_id,
            sender_name=sender_name,
            message=text,
            direction=direction,
            created_at=created_at,
            platform="instagram",
        )

        if participant_username:
            p_name = p_data.get("name") or p_data.get("displayName") or conv.get("participantName")
            pic_url = (
                p_data.get("profilePicUrl")
                or p_data.get("profile_pic")
                or p_data.get("profile_picture")
                or conv.get("participantPicture")
            )
            await message_repo.upsert_conversation(
                conn, final_conv_id, participant_username, p_name, pic_url
            )

    return {"status": "ok", "msg_id": str(msg_id), "direction": direction}

