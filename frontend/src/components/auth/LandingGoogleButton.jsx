import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useGoogleIdToken } from "../../hooks/useGoogleIdToken";

/**
 * Landing-page Google control.
 *
 * Keeps the landing page's original custom pill (Google mark leading the
 * label) while running the exact same ID-token flow as the login/signup
 * buttons. An invisible official GSI button is overlaid on the pill so a
 * click opens the real Google popup; clicking an edge the overlay misses falls
 * back to `prompt()`.
 */
export default function LandingGoogleButton({ onSuccess, disabled = false }) {
  const pillRef = useRef(null);
  const gsiRef = useRef(null);
  const { ready, isConnecting } = useGoogleIdToken(onSuccess);

  const busy = disabled || isConnecting;

  useEffect(() => {
    if (!ready || !gsiRef.current || !window.google?.accounts?.id) return;

    // Match the invisible official button to the pill's width so the whole
    // pill is clickable.
    const width = Math.round(pillRef.current?.offsetWidth || 240);
    gsiRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(gsiRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "signin_with",
      logo_alignment: "left",
      width,
    });
  }, [ready]);

  const handleFallbackClick = () => {
    // Only reached when the click didn't land on the invisible Google button
    // (e.g. the few pixels above/below its 40px frame).
    if (busy || !ready) return;
    window.google?.accounts?.id?.prompt();
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={pillRef}
        type="button"
        onClick={handleFallbackClick}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex items-center gap-3 px-7 py-4 rounded-full bg-[#191918] text-white text-sm font-semibold hover:bg-[#2b2a28] transition-all shadow-md active:scale-[0.98] disabled:opacity-90"
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Connecting to Google…</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 bg-white rounded-full p-0.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              ></path>
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              ></path>
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              ></path>
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              ></path>
            </svg>
            <span>Sign in with Google</span>
          </>
        )}
      </button>

      {/*
        Invisible official Google button that receives the clicks. The wrapper
        passes pointer events through to the pill, while the rendered iframe
        itself stays interactive so it can open the popup.
      */}
      <div
        ref={gsiRef}
        aria-hidden="true"
        className={`absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-full opacity-[0.001] pointer-events-none [&_iframe]:pointer-events-auto ${
          busy ? "[&_iframe]:!pointer-events-none" : ""
        }`}
      />
    </div>
  );
}
