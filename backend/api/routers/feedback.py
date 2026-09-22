"""
api/routers/feedback.py
========================
LAYER: Router - REST endpoints for user feature requests and admin responses.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db import get_pool
from dependencies import require_user, require_admin
from services import feedback_service
from repositories import feedback_repo
from api.errors import ValidationError, NotFoundError

router = APIRouter(prefix="/feedback", tags=["Feedback"])


class SubmitFeedbackBody(BaseModel):
    category: str = "feature_suggestion"
    message: str


class ReplyFeedbackBody(BaseModel):
    reply_message: str


@router.post("", status_code=201)
async def submit_feedback(body: SubmitFeedbackBody, user=Depends(require_user)):
    msg = body.message.strip()
    if not msg:
        raise ValidationError("Message text cannot be empty", code="EMPTY_MESSAGE")

    pool = await get_pool()
    async with pool.acquire() as conn:
        res = await feedback_service.submit_user_feedback(
            conn,
            user_id=user["id"],
            user_email=user["email"],
            message=msg,
            category=body.category.strip(),
        )
    return {"success": True, "feedback": res, "message": "Thank you! Your feature suggestion has been submitted."}


@router.get("")
async def list_feedback(admin=Depends(require_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        items = await feedback_repo.get_all_feedback(conn)
    return {"feedback": items}


@router.post("/{feedback_id}/reply")
async def reply_to_feedback(feedback_id: int, body: ReplyFeedbackBody, admin=Depends(require_admin)):
    reply_text = body.reply_message.strip()
    if not reply_text:
        raise ValidationError("Reply message text cannot be empty", code="EMPTY_REPLY")

    pool = await get_pool()
    async with pool.acquire() as conn:
        updated = await feedback_service.reply_user_feedback(conn, feedback_id, reply_text)

    if not updated:
        raise NotFoundError("Feedback entry not found", code="FEEDBACK_NOT_FOUND")

    return {"success": True, "feedback": updated, "message": "Reply email dispatched to user."}
