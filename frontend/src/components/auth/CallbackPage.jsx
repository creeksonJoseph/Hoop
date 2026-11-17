import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SPINNER_DURATION = 2000;

export default function CallbackPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Delay routing to show the loading view
    const timer = setTimeout(() => {
      if (user) {
        // User already logged in, determine routing
        const onboarded = user.onboarded !== false && user.onboarded !== undefined;
        if (onboarded) {
          navigate("/home", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      } else {
        // No user, go to login
        navigate("/login", { replace: true });
      }
    }, SPINNER_DURATION);

    return () => clearTimeout(timer);
  }, [user, navigate]);

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
          </div>
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