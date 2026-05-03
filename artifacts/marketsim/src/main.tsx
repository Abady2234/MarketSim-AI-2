import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ── Register Service Worker ──────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = import.meta.env.BASE_URL + "sw.js";
    navigator.serviceWorker
      .register(swUrl, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        // Check for updates every 60 seconds
        setInterval(() => registration.update(), 60_000);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available — tell SW to skip waiting
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {
        // SW registration failed silently — app still works normally
      });
  });
}
