import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) return;

    // Don't show if already running as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 3 seconds so user has time to see the app
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  if (!show || dismissed || installed) return null;

  return (
    <div
      className="fixed bottom-5 right-0 left-0 z-[200] flex justify-center px-4"
      style={{ animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        className="w-full max-w-sm rounded-2xl border border-violet-500/25 p-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(26,5,51,0.97) 0%, rgba(6,4,15,0.97) 100%)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 8px 40px rgba(139,92,246,0.25), 0 0 0 1px rgba(139,92,246,0.1)",
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
        >
          ⚡
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm leading-tight mb-0.5">
            أضف إلى الشاشة الرئيسية
          </p>
          <p className="text-white/40 text-xs leading-relaxed">
            شغّل MarketSim AI كتطبيق كامل بدون متصفح
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg text-xs font-black text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow: "0 4px 12px rgba(139,92,246,0.4)",
            }}
          >
            تثبيت
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40 hover:text-white/70 transition-colors"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
