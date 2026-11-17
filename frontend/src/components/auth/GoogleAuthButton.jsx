import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export default function GoogleAuthButton({
  onSuccess,
  disabled = false,
  text = "continue_with",
  theme = "outline",
  width = 320,
}) {
  const buttonRef = useRef(null);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "288617280571-9ks7uahnh1a2q6ovicor36ftcf4rnm8h.apps.googleusercontent.com";
    let cancelled = false;

    const initialize = () => {
      if (!window.google?.accounts?.id) {
        setError("Google sign-in script could not be loaded.");
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) {
              setError("Google sign-in was canceled.");
              setIsConnecting(false);
              return;
            }
            setError("");
            setIsConnecting(true);
            try {
              await onSuccessRef.current(response.credential);
            } catch (err) {
              setError(err?.message || "Google sign-in failed.");
              setIsConnecting(false);
            }
          },
          ux_mode: "popup",
        });

        if (cancelled || !buttonRef.current) return;
        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme,
          size: "large",
          text, // "continue_with" | "signup_with" | "signin_with"
          shape: "pill",
          width,
        });
        setTimeout(() => {
          if (!cancelled) setRendered(true);
        }, 40);
      } catch {
        setError("Failed to initialize Google sign-in.");
      }
    };

    if (window.google?.accounts?.id) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    script.onerror = () => setError("Unable to load Google sign-in script.");
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [text, theme, width]);

  return (
    <div
      className={`w-full flex flex-col items-center justify-center ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {error && (
        <p className="mb-2 text-[12px] text-[#e32d14] font-medium">{error}</p>
      )}

      {/* Keep the Google button mounted so it can be shown again if a
          sign-in attempt fails; only visually swap in the spinner. */}
      <div className="relative w-full min-h-[44px] flex items-center justify-center">
        <div
          ref={buttonRef}
          className={`flex justify-center ${isConnecting ? "invisible" : ""} ${
            rendered ? "" : "min-h-[44px] w-[280px] bg-[#f6f5f4] rounded-full animate-pulse"
          }`}
        />
        {isConnecting && (
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
