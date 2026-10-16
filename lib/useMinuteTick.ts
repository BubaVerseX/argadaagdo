"use client";

import { useEffect, useState } from "react";

// Re-render once a minute so time-based UI (cancellation deadline, pickup
// window open/closed, offer expiry) updates without a page reload.
export function useMinuteTick() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setTick((currentTick) => currentTick + 1),
      60_000
    );

    return () => window.clearInterval(interval);
  }, []);

  return tick;
}
