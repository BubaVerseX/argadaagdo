"use client";

import AppNotification from "@/components/AppNotification";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useState } from "react";

/**
 * Settings sends people to /?account=deleted after deleting their account
 * (website and app). Confirms it once on the home screen, then drops the
 * parameter so a reload or a shared link doesn't show it again.
 */
export default function AccountDeletedNotice() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("account") !== "deleted") return;

    url.searchParams.delete("account");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );

    // Read after hydration (the server can't see the query); shown next tick.
    // No cleanup: the parameter is gone by a second (Strict Mode) run.
    window.setTimeout(() => setVisible(true), 0);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="pointer-events-auto w-full max-w-md shadow-[var(--shadow-card)]">
        <AppNotification tone="success" onDismiss={() => setVisible(false)}>
          {language === "ka" ? "ანგარიში წაიშალა." : "Your account was deleted."}
        </AppNotification>
      </div>
    </div>
  );
}
