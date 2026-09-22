import React, { useState, useEffect } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      return;
    }

    // Check if user recently dismissed the prompt (within 7 days)
    const dismissedTime = localStorage.getItem("hoop_pwa_dismissed");
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const iosDevice = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream;
    setIsIos(iosDevice);

    if (iosDevice) {
      // iOS Safari doesn't support beforeinstallprompt - show prompt after 3s
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android / Chrome / Edge beforeinstallprompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("hoop_pwa_dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#191918] text-white rounded-[14px] p-4 shadow-xl border border-white/10 flex flex-col gap-3 font-sans">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[10px] bg-white text-[#191918] text-base font-bold shrink-0 shadow-xs">
              H
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white tracking-tight">
                Install Hoop App
              </h3>
              <p className="text-[12px] text-[#a39e98] leading-tight mt-0.5">
                Add to your home screen for full-screen performance & quick access.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[#a39e98] hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Android / Desktop Install Action */}
        {!isIos && deferredPrompt && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-white hover:bg-[#f0f0f0] text-[#191918] text-[12.5px] font-semibold py-2 px-3 rounded-[8px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download size={15} />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="text-[12px] text-[#a39e98] hover:text-white py-2 px-3 transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        )}

        {/* iOS Install Instructions */}
        {isIos && (
          <div className="bg-white/5 rounded-[10px] p-3 text-[12px] text-[#d4d0cb] space-y-2 border border-white/5 mt-1">
            <p className="font-medium text-white flex items-center gap-1.5">
              <Smartphone size={14} className="text-[#0075de]" /> To install on your browser:
            </p>
            <ol className="space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">1</span>
                Tap the <strong className="text-white inline-flex items-center gap-1">Share <Share size={13} className="text-[#0075de]" /></strong> or menu button in your browser.
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">2</span>
                Scroll down & select <strong className="text-white inline-flex items-center gap-1">Add to Home Screen <PlusSquare size={13} className="text-[#0075de]" /></strong>.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
