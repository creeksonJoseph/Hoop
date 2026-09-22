import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  KeyRound,
  Loader as Loader2,
  CircleAlert as AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useSignup, useGoogleAuth, useSendOTP, useVerifyOTP } from "../hooks/useAuthForms";
import GoogleAuthButton from "../components/auth/GoogleAuthButton";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const { submit: directSignup, loading: directLoading, error: directError } = useSignup();
  const { submitGoogleToken, loading: googleLoading, error: googleError } = useGoogleAuth();
  const { sendOTP, loading: sendOtpLoading, error: sendOtpError } = useSendOTP();
  const { verifyOTP, loading: verifyOtpLoading, error: verifyOtpError } = useVerifyOTP();

  const activeError = directError || googleError || sendOtpError || verifyOtpError;
  const loading = directLoading || googleLoading || sendOtpLoading || verifyOtpLoading;

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) return;
    const ok = await sendOTP(email);
    if (ok) setOtpSent(true);
  };

  const handleVerifyAndSignup = (e) => {
    e.preventDefault();
    verifyOTP(email, otpCode, password, confirm);
  };

  const handleDirectSignup = (e) => {
    e.preventDefault();
    directSignup(email, password, confirm);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#191918] flex items-center justify-center p-4 selection:bg-[#e6f3fe] selection:text-[#0075de] font-sans">
      <div className="w-full max-w-[380px] space-y-6 fade-up">
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#191918] text-lg font-bold text-white shadow-sm">
            H
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-[#191918] tracking-tight">
              Create your Hooop account
            </h1>
            <p className="text-[13px] text-[#615d59] mt-1">
              When you're out of words, let your wingman handle it.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] space-y-5">
          {activeError && (
            <div className="p-3 bg-[#fff0f0] border border-[#ffcdd2] text-[#d32f2f] text-[13px] rounded-[8px] flex items-start gap-2.5">
              <AlertCircle
                size={16}
                className="shrink-0 text-[#d32f2f] mt-0.5"
              />
              <span className="leading-snug">{activeError}</span>
            </div>
          )}

          {/* Google Sign Up */}
          <div className="space-y-3">
            <GoogleAuthButton
              onSuccess={submitGoogleToken}
              disabled={loading}
              text="signup_with"
            />
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#dfdcd9]" />
              <span className="bg-white px-2.5 text-[11px] font-medium text-[#8c8782] uppercase tracking-wider absolute">
                or
              </span>
            </div>
          </div>

          {!otpSent ? (
            <form onSubmit={handleDirectSignup} className="space-y-4">
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
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    placeholder="name@organization.com"
                  />
                </div>
              </div>

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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    placeholder="••••••••"
                  />
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
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0075de] hover:bg-[#005bab] active:bg-[#00396b] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={!email || loading}
                  className="text-[11px] font-semibold text-[#0075de] hover:underline disabled:opacity-40 cursor-pointer"
                >
                  Or verify email with 6-digit OTP code →
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndSignup} className="space-y-4">
              <div className="p-2.5 bg-[#e6f3fe] border border-[#bae6fd] rounded-[8px] text-[12px] text-[#0369a1] flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-[#0284c7]" />
                <span>Verification code sent to <strong>{email}</strong></span>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]"
                    strokeWidth={2}
                  />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[14px] font-mono tracking-widest text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
              </div>

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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    placeholder="••••••••"
                  />
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
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !otpCode}
                className="w-full bg-[#0075de] hover:bg-[#005bab] active:bg-[#00396b] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Verifying…
                  </>
                ) : (
                  "Verify Code & Sign Up"
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-[11px] text-[#615d59] hover:underline cursor-pointer"
                >
                  ← Back to standard signup
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-[#f0f0f0] text-center">
            <p className="text-[12px] text-[#615d59]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#0075de] hover:text-[#005bab] transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
            <Link
              to="/privacy"
              className="mt-2 inline-block text-[11px] text-[#8c8782] hover:text-[#0075de] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
