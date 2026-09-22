"""
api/schemas/auth.py
====================
Pydantic request & response schemas for authentication router.
"""
from pydantic import BaseModel


class LoginBody(BaseModel):
    email: str
    password: str


class SignupBody(BaseModel):
    email: str
    password: str
    confirm_password: str


class GoogleLoginBody(BaseModel):
    credential: str


class SendOTPBody(BaseModel):
    email: str


class VerifyOTPBody(BaseModel):
    email: str
    code: str
    password: str
    confirm_password: str


class SignupSendOtpBody(BaseModel):
    email: str


class SignupVerifyOtpBody(BaseModel):
    email: str
    otp: str


class SignupCompleteBody(BaseModel):
    signup_token: str
    password: str
    confirm_password: str


class ForgotPasswordBody(BaseModel):
    email: str


class ResetPasswordBody(BaseModel):
    email: str
    otp: str
    new_password: str
    confirm_password: str


class ChangePasswordBody(BaseModel):
    otp: str
    new_password: str
    confirm_password: str
