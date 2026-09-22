import React from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft, Loader as Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChangePassword } from "../hooks/usePasswordReset";
import NavRail from "../components/NavRail";

export default function SecurityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    pwdStep,
    setPwdStep,
    pwdForm,
    setPwdForm,
    showPwd,
    setShowPwd,
    pwdLoading,
    pwdError,
    setPwdError,
    pwdSuccess,
    pwdCountdown,
    handleRequestChangeOtp,
    handleVerifyOtp,
    handleResendOtp,
    handleChangePassword,
  } = useChangePassword();

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#f9f9f8] text-[#191918] font-sans">
      <NavRail activePage="settings" />

      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar px-4 py-8 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:py-12 md:pt-12 md:pb-24 sm:px-8 md:px-12">
        <div className="w-full max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-2">
            <button
              onClick={() => navigate("/settings")}
              className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-[8px] border border-[#dfdcd9] text-[11px] sm:text-xs font-medium text-[#191918] bg-white hover:bg-[#f0eeec] transition-colors self-start shadow-xs cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Settings</span>
            </button>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#191918]">
                Password & Security
              </h1>
              <p className="text-xs sm:text-sm text-[#615d59] mt-0.5">
                Manage your account password and security preferences.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 max-w-4xl">
              {/* Left Column: OTP Verification Flow */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[#191918]">
                    1. Verification Code
                  </h2>
                  <p className="text-xs text-[#615d59] mt-0.5">
                    Request and verify a 6-digit security code sent to your email.
                  </p>
                </div>

                {pwdSuccess && (
                  <div className="p-3 rounded-[8px] border text-xs font-medium inline-flex items-center gap-2 bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]">
                    <CheckCircle2 size={16} />
                    {pwdSuccess}
                  </div>
                )}

                {/* STEP 1: Request OTP */}
                {pwdStep === 1 && (
                  <form onSubmit={handleRequestChangeOtp} className="space-y-4">
                    <div className="p-3.5 rounded-[8px] border border-[#dfdcd9] bg-[#f9f9f8] text-xs text-[#615d59] leading-relaxed">
                      We will send a 6-digit security code to{" "}
                      <span className="font-bold text-[#191918]">
                        {user?.email || "your registered email"}
                      </span>{" "}
                      to verify your request before changing your password.
                    </div>

                    {pwdError && (
                      <div className="p-3 rounded-[8px] border border-[#ffcdd2] bg-[#fff0f0] text-xs text-[#d32f2f]">
                        {pwdError}
                      </div>
                    )}

                    <div>
                      <button
                        type="submit"
                        disabled={pwdLoading}
                        className="inline-flex items-center justify-center py-2 px-4 rounded-[8px] font-medium text-xs text-white bg-[#191918] hover:bg-[#333] active:bg-[#0f0f0f] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {pwdLoading ? (
                          <div className="flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin" /> Sending…
                          </div>
                        ) : (
                          <span>Send Verification Code</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2 & 3: Enter OTP */}
                {pwdStep >= 2 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3 rounded-[8px] border border-[#fde68a] bg-[#fffbeb] text-xs text-[#92400e] font-medium">
                      Verification code sent to <strong>{user?.email}</strong>.
                    </div>

                    {pwdError && (
                      <div className="p-3 rounded-[8px] border border-[#ffcdd2] bg-[#fff0f0] text-xs text-[#d32f2f]">
                        {pwdError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#191918] uppercase tracking-wider">
                        Enter 6-Digit Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        disabled={pwdStep === 3}
                        value={pwdForm.otp}
                        onChange={(e) => {
                          setPwdForm((prev) => ({ ...prev, otp: e.target.value }));
                          setPwdError("");
                        }}
                        placeholder="000000"
                        className="w-56 px-4 py-2.5 rounded-[8px] tracking-[0.5em] text-center font-mono text-lg outline-none border border-[#dfdcd9] focus:border-[#191918] focus:ring-2 focus:ring-[#191918]/15 bg-white text-[#191918] transition-all block disabled:bg-[#f6f5f4] disabled:opacity-80"
                      />
                    </div>

                    {pwdStep === 2 && (
                      <div>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center py-2 px-4 rounded-[8px] font-medium text-xs text-white bg-[#191918] hover:bg-[#333] active:bg-[#0f0f0f] transition-all shadow-xs cursor-pointer"
                        >
                          Verify Code & Continue
                        </button>
                      </div>
                    )}

                    {pwdStep === 3 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#bbf7d0] bg-[#f0fdf4] text-xs font-semibold text-[#15803d]">
                        <CheckCircle2 size={15} /> Code Verified!
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1.5 w-56 text-xs text-[#615d59]">
                      <button
                        type="button"
                        onClick={() => {
                          setPwdStep(1);
                          setPwdError("");
                        }}
                        className="flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <ArrowLeft size={14} /> Reset
                      </button>

                      {pwdStep === 2 &&
                        (pwdCountdown > 0 ? (
                          <span>
                            Resend in <strong className="text-[#191918]">{pwdCountdown}s</strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={pwdLoading}
                            className="font-semibold text-[#191918] hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {pwdLoading ? "Sending..." : "Resend Code"}
                          </button>
                        ))}
                    </div>
                  </form>
                )}
              </div>

              {/* Right Column: Set New Password */}
              <div
                className={`transition-all duration-300 ${
                  pwdStep < 3
                    ? "opacity-40 blur-[1.5px] pointer-events-none select-none"
                    : "opacity-100 blur-none pointer-events-auto"
                }`}
              >
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-[#191918]">
                    2. Set New Password
                  </h2>
                  <p className="text-xs text-[#615d59] mt-0.5">
                    {pwdStep < 3
                      ? "🔒 Verify security code on the left to unlock."
                      : "Enter your new password below."}
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#191918] uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        required
                        disabled={pwdStep < 3}
                        value={pwdForm.next}
                        onChange={(e) => {
                          setPwdForm((prev) => ({ ...prev, next: e.target.value }));
                          setPwdError("");
                        }}
                        placeholder="Min. 8 characters"
                        className="w-full pl-3.5 pr-10 py-2 rounded-[8px] text-xs outline-none border border-[#dfdcd9] focus:border-[#191918] focus:ring-2 focus:ring-[#191918]/15 bg-white text-[#191918] transition-all"
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

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#191918] uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      disabled={pwdStep < 3}
                      value={pwdForm.confirm}
                      onChange={(e) => {
                        setPwdForm((prev) => ({ ...prev, confirm: e.target.value }));
                        setPwdError("");
                      }}
                      placeholder="Confirm new password"
                      className="w-full px-3.5 py-2 rounded-[8px] text-xs outline-none border border-[#dfdcd9] focus:border-[#191918] focus:ring-2 focus:ring-[#191918]/15 bg-white text-[#191918] transition-all"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={pwdStep < 3 || pwdLoading}
                      className="inline-flex items-center justify-center py-2 px-4 rounded-[8px] font-medium text-xs text-white bg-[#191918] hover:bg-[#333] active:bg-[#0f0f0f] transition-all shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {pwdLoading ? (
                        <div className="flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin" /> Updating…
                        </div>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
