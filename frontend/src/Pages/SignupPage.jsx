import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useSignupFlow, useGoogleAuth } from "../hooks/useAuthForms";
import GoogleAuthButton from "../components/auth/GoogleAuthButton";

// Step indicator dots
function Steps({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className="rounded-full transition-all duration-300"
          style={{
            width: s === current ? "24px" : "8px",
            height: "8px",
            backgroundColor: s <= current ? "#191918" : "#dfdcd9",
          }}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const {
    step,
    email,
    setEmail,
    otp,
    setOtp,
    form,
    setForm,
    showPwd,
    setShowPwd,
    loading: flowLoading,
    error: flowError,
    countdown,
    clearError,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
    handleComplete,
    resetToEmail,
  } = useSignupFlow();

  const {
    submitGoogleToken,
    loading: googleLoading,
    error: googleError,
  } = useGoogleAuth();

  const loading = flowLoading || googleLoading;
  const activeError = flowError || googleError;

  const stepTitles = {
    1: {
      heading: "Create your Hooop account",
      sub: "Start by entering your email address below.",
    },
    2: {
      heading: "Check your email",
      sub: `We sent a 6-digit code to ${email}`,
    },
    3: {
      heading: "Set your password",
      sub: "Choose a strong password for your account.",
    },
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#191918] flex items-center justify-center p-4 selection:bg-[#e6f3fe] selection:text-[#0075de] font-sans">
      <div className="w-full max-w-[400px] space-y-6 fade-up">
        {/* Header logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#191918] text-lg font-bold text-white shadow-sm">
            H
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-[#191918] tracking-tight">
              {stepTitles[step].heading}
            </h1>
            <p className="text-[13px] text-[#615d59] mt-1">
              {stepTitles[step].sub}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] space-y-5">
          <Steps current={step} />

          {activeError && (
            <div className="p-3 bg-[#fff0f0] border border-[#ffcdd2] text-[#d32f2f] text-[13px] rounded-[8px] flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-[#d32f2f] mt-0.5" />
              <span className="leading-snug">{activeError}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <div className="space-y-4">
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]"
                      strokeWidth={2}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError();
                      }}
                      className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#191918] focus:ring-2 focus:ring-[#191918]/15 transition-all"
                      placeholder="name@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#191918] hover:bg-[#333] active:bg-[#0f0f0f] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Sending code…
                    </>
                  ) : (
                    "Continue with Email"
                  )}
                </button>
              </form>

              <div className="relative flex items-center justify-center py-1">
                <div className="w-full border-t border-[#dfdcd9]" />
                <span className="bg-white px-2.5 text-[11px] font-medium text-[#8c8782] uppercase tracking-wider absolute">
                  or
                </span>
              </div>

              <GoogleAuthButton
                onSuccess={submitGoogleToken}
                disabled={loading}
                text="signup_with"
              />
            </div>
          )}

          {/* STEP 2: Enter Verification Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]"
                    strokeWidth={2}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      clearError();
                    }}
                    placeholder="000000"
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[14px] font-mono tracking-[0.4em] text-center text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#191918] focus:ring-2 focus:ring-[#191918]/15 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !otp}
                className="w-full bg-[#191918] hover:bg-[#333] active:bg-[#0f0f0f] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Verifying…
                  </>
                ) : (
                  "Verify Code"
                )}
              </button>

              <div className="flex flex-col items-center gap-2 pt-2 text-[12px] text-[#615d59]">
                {countdown > 0 ? (
                  <p>
                    Resend code in <strong className="text-[#191918]">{countdown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="font-semibold text-[#191918] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Resend code"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetToEmail}
                  className="hover:underline cursor-pointer text-[#8c8782] flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Use a different email
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set Password */}
          {step === 3 && (
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]"
                    strokeWidth={2}
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, password: e.target.value }));
                      clearError();
                    }}
                    placeholder="Min. 8 characters"
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-10 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#191918] focus:ring-2 focus:ring-[#191918]/15 transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-0 inset-y-0 px-3 flex items-center text-[#8c8782] hover:text-[#191918]"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]"
                    strokeWidth={2}
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={form.confirm}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, confirm: e.target.value }));
                      clearError();
                    }}
                    placeholder="Confirm new password"
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#191918] focus:ring-2 focus:ring-[#191918]/15 transition-all"
                  />
                </div>
              </div>

              {/* Password strength indicator */}
              {form.password && (
                <div className="flex gap-1 h-1 pt-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          form.password.length > i * 3
                            ? form.password.length >= 12
                              ? "#15803D"
                              : form.password.length >= 8
                              ? "#ca8a04"
                              : "#ba1a1a"
                            : "#dfdcd9",
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !form.password || !form.confirm}
                className="w-full bg-[#191918] hover:bg-[#333] active:bg-[#0f0f0f] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[#f0f0f0] text-center">
            <p className="text-[12px] text-[#615d59]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#191918] hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
