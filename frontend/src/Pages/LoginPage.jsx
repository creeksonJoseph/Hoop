import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Loader as Loader2,
  CircleAlert as AlertCircle,
} from "lucide-react";
import { useLogin, useGoogleAuth } from "../hooks/useAuthForms";
import GoogleAuthButton from "../components/auth/GoogleAuthButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { submit, loading, error: loginError } = useLogin();
  const { submitGoogleToken, loading: googleLoading, error: googleError } = useGoogleAuth();

  const activeError = loginError || googleError;

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(email, password);
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
              Sign in to Hooop
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

          {/* Google Sign In */}
          <div className="space-y-3">
            <GoogleAuthButton
              onSuccess={submitGoogleToken}
              disabled={loading || googleLoading}
              text="signin_with"
            />
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#dfdcd9]" />
              <span className="bg-white px-2.5 text-[11px] font-medium text-[#8c8782] uppercase tracking-wider absolute">
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-medium text-[#494744]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-[#0075de] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0075de] hover:bg-[#005bab] active:bg-[#00396b] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#f0f0f0] text-center">
            <p className="text-[12px] text-[#615d59]">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#0075de] hover:text-[#005bab] transition-colors font-medium"
              >
                Sign up
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
