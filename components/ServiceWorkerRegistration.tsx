"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // In `next dev` a cache-first worker would serve stale chunks and stay
    // registered on localhost for other projects.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — if registration
      // fails, the app just keeps working as a regular website.
    });
  }, []);

  return null;
}
