import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useGoogleIdToken } from "../../hooks/useGoogleIdToken";

/**
 * Reusable "Sign in with Google" button (login & signup pages).
 *
 * The auth logic lives in `useGoogleIdToken`; this component only renders the
 * official Google button and the connecting state.
 */
export default function GoogleAuthButton({
  onSuccess,
  disabled = false,
  text = "continue_with",
  theme = "outline",
  width = 320,
}) {
  const buttonRef = useRef(null);
  const { ready, error, isConnecting } = useGoogleIdToken(onSuccess);

  const busy = disabled || isConnecting;

  useEffect(() => {
    if (!ready || !buttonRef.current || !window.google?.accounts?.id) return;

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme,
      size: "large",
      text, // "continue_with" | "signup_with" | "signin_with"
      shape: "pill",
      width,
    });
  }, [ready, text, theme, width]);

  return (
    <div
      className={`w-full flex flex-col items-center justify-center ${
        busy ? "opacity-80 pointer-events-none" : ""
      }`}
    >
      {error && (
        <p className="mb-2 text-[12px] text-[#e32d14] font-medium">{error}</p>
      )}

      {/* Keep the Google button mounted so it can reappear after an error;
          only visually swap in the spinner. */}
      <div className="relative w-full min-h-[44px] flex items-center justify-center">
        <div
          ref={buttonRef}
          className={`flex justify-center ${busy ? "invisible" : ""}`}
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center gap-2.5">
            <Loader2 size={16} className="animate-spin text-[#191918]" />
            <span className="text-sm text-[#191918] font-medium">
              Connecting to Google…
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
