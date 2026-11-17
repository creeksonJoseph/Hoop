import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

// Keep the loading view visible just long enough to avoid an abrupt flash,
// while still feeling like an automatic redirect.
const MIN_DISPLAY_MS = 700;

export default function CallbackPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait until the auth state has resolved before routing.
    if (loading) return;

    let cancelled = false;

    const resolveTarget = async () => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      // Target decided earlier in the auth flow (Google new vs returning user).
      const storedTarget = sessionStorage.getItem("hoop_post_auth_target");
      const redirectAfterLogin = sessionStorage.getItem(
        "hoop_redirect_after_login",
      );

      let onboarded = user.onboarded;
      // Fall back to the backend if we don't yet know the onboarding state
      // (e.g. a session restored from an older localStorage payload).
      if (typeof onboarded !== "boolean") {
        try {
          const { data } = await api.get("/auth/me");
          onboarded = data?.onboarded === true;
        } catch {
          onboarded = false;
        }
      }

      if (cancelled) return;

      const target =
        redirectAfterLogin ||
        storedTarget ||
        (onboarded ? "/home" : "/onboarding");

      sessionStorage.removeItem("hoop_post_auth_target");
      sessionStorage.removeItem("hoop_redirect_after_login");
      navigate(target, { replace: true });
    };

    const timer = setTimeout(resolveTarget, MIN_DISPLAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#191918] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-[#eff4ff] flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-7 h-7 text-[#0075de]"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" rx="8" fill="#191918" />
            <path fill="#FFFFFF" d="M8 7h4v7h8V7h4v18h-4v-7H12v7H8V7z" />
          </svg>
        </div>

        <div className="text-xl font-bold text-[#191918] mb-4">Hooop</div>
        <div className="text-base text-[#615d59] mb-8">Signing you in…</div>

        <div className="flex items-center justify-center mx-auto">
          <Loader2 size={32} className="animate-spin text-[#0075de]" />
        </div>
      </div>
    </div>
  );
}
