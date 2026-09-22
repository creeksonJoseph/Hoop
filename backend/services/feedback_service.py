"""
services/feedback_service.py
==============================
LAYER: Service - Feature Suggestions & Feedback business workflows and Resend email dispatch.
Dispatches instant HTML notification emails to charanajoseph@gmail.com upon submission,
and dispatches user reply emails when admin responds via Admin Portal.
"""
import logging
import httpx
import asyncpg
from typing import List, Optional, Tuple

import config
from repositories import feedback_repo

logger = logging.getLogger("hoop.feedback")
ADMIN_EMAIL = "charanajoseph@gmail.com"


async def send_feedback_admin_notification(
    user_email: str,
    message: str,
    category: str,
    feedback_id: int
) -> Tuple[bool, str]:
    """Send styled HTML notification email to charanajoseph@gmail.com via Resend API."""
    if not config.RESEND_API_KEY:
        logger.warning(f"[FEEDBACK DEV] Resend key missing. Feedback from {user_email}: {message}")
        return True, "Development mode: Notification logged."

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {config.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    formatted_cat = category.replace("_", " ").title()
    is_bug = "bug" in category.lower()
    heading_title = "New Bug Report" if is_bug else "New Feature Suggestion"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>{heading_title} - Hoop</title>
    </head>
    <body style="margin:0; padding:24px 12px; background-color:#f9f9f8; font-family:Arial, sans-serif; color:#191918;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <div style="max-width: 540px; width: 100%; text-align: left; background-color: #ffffff; border: 1px solid #dfdcd9; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #dfdcd9; padding-bottom: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: #191918;">Hoop Admin Alert</span>
                <span style="margin-left: auto; padding: 4px 10px; border-radius: 20px; background-color: #f0f0f0; color: #191918; font-size: 11px; font-weight: bold;">{formatted_cat}</span>
              </div>
              <h2 style="font-size: 18px; color: #191918; margin: 0 0 12px 0;">{heading_title}</h2>
              <div style="background-color: #f9f9f8; border: 1px solid #dfdcd9; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
                <p style="font-size: 13px; color: #615d59; margin: 0 0 4px 0;">Submitted by:</p>
                <p style="font-size: 14px; font-weight: bold; color: #191918; margin: 0;">{user_email}</p>
              </div>
              <div style="margin-bottom: 20px;">
                <p style="font-size: 12px; font-weight: bold; color: #615d59; text-transform: uppercase; margin: 0 0 6px 0;">Message</p>
                <div style="background-color: #f9f9f8; border: 1px solid #dfdcd9; border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.5; color: #191918; white-space: pre-wrap;">"{message}"</div>
              </div>
              <div style="padding-top: 16px; border-top: 1px solid #dfdcd9; text-align: right;">
                <a href="https://hooop.tech/admin" style="display: inline-block; padding: 10px 18px; border-radius: 8px; background-color: #191918; color: #ffffff; font-weight: bold; font-size: 12px; text-decoration: none;">Reply in Admin Portal &rarr;</a>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    from_addr = config.RESEND_FROM_EMAIL or "Hoop <auth@hooop.tech>"
    payload = {
        "from": from_addr,
        "to": [ADMIN_EMAIL],
        "subject": f"[{formatted_cat}] New Feedback from {user_email}",
        "html": html_content,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                logger.info(f"[Resend] Admin notification sent to {ADMIN_EMAIL}")
                return True, "Notification email sent."
            
            # Fallback if domain is unverified
            if resp.status_code in (400, 403, 422) and "onboarding@resend.dev" not in from_addr:
                payload["from"] = "Hoop <onboarding@resend.dev>"
                fallback_resp = await client.post(url, json=payload, headers=headers)
                if fallback_resp.status_code in (200, 201):
                    return True, "Notification sent via test domain."
            
            logger.error(f"[Resend] Admin notification error status={resp.status_code}")
            return False, f"Resend API error: {resp.status_code}"
    except Exception as exc:
        logger.error(f"[Resend] Request failed: {exc}")
        return False, str(exc)


async def send_user_reply_email(user_email: str, reply_message: str) -> Tuple[bool, str]:
    """Send reply HTML email to user from Hoop Admin."""
    if not config.RESEND_API_KEY:
        return True, "Development mode: Reply logged."

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {config.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Response to your Hoop Suggestion</title>
    </head>
    <body style="margin:0; padding:24px 12px; background-color:#f9f9f8; font-family:Arial, sans-serif; color:#191918;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <div style="max-width: 540px; width: 100%; text-align: left; background-color: #ffffff; border: 1px solid #dfdcd9; border-radius: 12px; padding: 24px;">
              <h2 style="font-size: 18px; color: #191918; margin-top: 0;">Response to your Hoop Suggestion</h2>
              <p style="font-size: 13px; color: #615d59;">Hi there,</p>
              <p style="font-size: 13px; color: #615d59;">Our team responded to your feedback:</p>
              <div style="background-color: #f9f9f8; border: 1px solid #dfdcd9; border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.6; color: #191918; margin-bottom: 20px; white-space: pre-wrap;">{reply_message}</div>
              <p style="font-size: 12px; color: #8c8782; margin: 0; padding-top: 12px; border-top: 1px solid #dfdcd9;">Thank you for helping us improve Hoop!</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    from_addr = config.RESEND_FROM_EMAIL or "Hoop <auth@hooop.tech>"
    payload = {
        "from": from_addr,
        "to": [user_email],
        "subject": "Re: Your Hoop Feature Suggestion",
        "html": html_content,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return True, "Reply email sent successfully."
            if resp.status_code in (400, 403, 422) and "onboarding@resend.dev" not in from_addr:
                payload["from"] = "Hoop <onboarding@resend.dev>"
                fallback_resp = await client.post(url, json=payload, headers=headers)
                if fallback_resp.status_code in (200, 201):
                    return True, "Reply sent via test domain."
            return False, f"Resend status: {resp.status_code}"
    except Exception as exc:
        return False, str(exc)


async def submit_user_feedback(conn: asyncpg.Connection, user_id: int, user_email: str, message: str, category: str) -> dict:
    feedback = await feedback_repo.create_feedback(conn, user_id=user_id, message=message, category=category)
    # Dispatch notification email in background
    try:
        await send_feedback_admin_notification(
            user_email=user_email,
            message=message,
            category=category,
            feedback_id=feedback["id"]
        )
    except Exception as exc:
        logger.error(f"[Feedback Notification Failed] {exc}")
    return feedback


async def reply_user_feedback(conn: asyncpg.Connection, feedback_id: int, reply_message: str) -> Optional[dict]:
    feedback = await feedback_repo.get_feedback_by_id(conn, feedback_id)
    if not feedback:
        return None

    updated = await feedback_repo.update_feedback_status(conn, feedback_id, status="replied")
    try:
        await send_user_reply_email(feedback["user_email"], reply_message)
    except Exception as exc:
        logger.error(f"[Feedback Reply Email Failed] {exc}")
    return updated
