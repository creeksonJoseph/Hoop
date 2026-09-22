import React, { useEffect, useRef, useState } from "react";

export default function GoogleAuthButton({ onSuccess, disabled = false, text = "continue_with" }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "288617280571-9ks7uahnh1a2q6ovicor36ftcf4rnm8h.apps.googleusercontent.com";

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
              return;
            }
            try {
              await onSuccessRef.current(response.credential);
            } catch (err) {
              setError(err?.message || "Google sign-in failed.");
            }
          },
          ux_mode: "popup",
        });

        if (buttonRef.current) {
          buttonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            text: text, // "continue_with" or "signup_with" or "signin_with"
            shape: "pill",
            width: 320,
          });
          setTimeout(() => setRendered(true), 40);
        }
      } catch (e) {
        setError("Failed to initialize Google sign-in.");
      }
    };

    if (window.google?.accounts?.id) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    script.onerror = () => setError("Unable to load Google sign-in script.");
    document.head.appendChild(script);

    return () => {
      // script cleanup if unmounted before onload
    };
  }, [text]);

  return (
    <div className={`w-full flex flex-col items-center justify-center ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {error && <p className="mb-2 text-[12px] text-[#e32d14] font-medium">{error}</p>}
      <div ref={buttonRef} className={rendered ? "w-full flex justify-center" : "min-h-[44px] w-[280px] bg-[#f6f5f4] rounded-full animate-pulse"} />
    </div>
  );
}
