import React from "react";
import { Link } from "react-router-dom";
import { Mail, KeyRound, Lock, Eye, EyeOff, Loader as Loader2, CircleAlert as AlertCircle } from "lucide-react";
import { usePasswordReset } from "../hooks/usePasswordReset";

export default function ForgotPasswordPage() {
  const {
    step,
    setStep,
    email,
    setEmail,
    form,
    setForm,
    showPwd,
    setShowPwd,
    loading,
    error,
    setError,
    countdown,
    handleSendOtp,
    handleResendOtp,
    handleReset,
  } = usePasswordReset();

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#191918] flex items-center justify-center p-4 selection:bg-[#e6f3fe] selection:text-[#0075de] font-sans">
      <div className="w-full max-w-[380px] space-y-6 fade-up">
        {/* Header logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#191918] text-lg font-bold text-white shadow-sm">
            H
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-[#191918] tracking-tight">
              {step === 1 ? "Forgot password?" : "Enter verification code"}
            </h1>
            <p className="text-[13px] text-[#615d59] mt-1">
              {step === 1
                ? "We'll send a 6-digit verification code to your email."
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] space-y-5">
          {error && (
            <div className="p-3 bg-[#fff0f0] border border-[#ffcdd2] text-[#d32f2f] text-[13px] rounded-[8px] flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-[#d32f2f] mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  Email Address
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
                      setError("");
                    }}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    placeholder="name@organization.com"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-[#0075de] hover:bg-[#005bab] active:bg-[#00396b] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Sending code…
                  </>
                ) : (
                  "Send Code"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  6-Digit Code
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
                    value={form.otp}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, otp: e.target.value }));
                      setError("");
                    }}
                    placeholder="000000"
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[14px] font-mono tracking-widest text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  New Password
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
                      setError("");
                    }}
                    placeholder="Min. 8 characters"
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-10 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
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
                  Confirm New Password
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
                      setError("");
                    }}
                    placeholder="Confirm new password"
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !form.otp || !form.password}
                className="w-full bg-[#0075de] hover:bg-[#005bab] active:bg-[#00396b] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Resetting…
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>

              <div className="flex flex-col items-center gap-2 pt-2 text-[12px] text-[#615d59]">
                {countdown > 0 ? (
                  <p>
                    Resend code in <strong className="text-[#0075de]">{countdown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="font-semibold text-[#0075de] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Resend code"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  className="hover:underline cursor-pointer text-[#8c8782]"
                >
                  ← Use a different email
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-[#f0f0f0] text-center">
            <p className="text-[12px] text-[#615d59]">
              Remembered your password?{" "}
              <Link to="/login" className="text-[#0075de] hover:text-[#005bab] transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
