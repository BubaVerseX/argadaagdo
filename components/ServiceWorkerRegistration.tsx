"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — if registration
      // fails, the app just keeps working as a regular website.
    });
  }, []);

  return null;
}
