import { useCallback, useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "288617280571-9ks7uahnh1a2q6ovicor36ftcf4rnm8h.apps.googleusercontent.com";

function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is unavailable."));
  }
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Unable to load Google sign-in.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });
}

/**
 * Shared Google Identity Services (ID-token) logic used by every
 * "Sign in with Google" control in the app.
 *
 * Callers only provide the credential handler and decide how to render the
 * button. This keeps the actual auth flow identical everywhere.
 */
export function useGoogleIdToken(onCredential) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  const handleCredential = useCallback(async (response) => {
    if (!response?.credential) {
      setError("Google sign-in was canceled.");
      setIsConnecting(false);
      return;
    }

    setError("");
    setIsConnecting(true);
    try {
      await onCredentialRef.current(response.credential);
    } catch (err) {
      setError(err?.message || "Google sign-in failed.");
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
          ux_mode: "popup",
        });
        setReady(true);
      })
      .catch((err) => {
        setError(err?.message || "Unable to load Google sign-in.");
      });

    return () => {
      cancelled = true;
    };
  }, [handleCredential]);

  return { ready, error, isConnecting, setError };
}
