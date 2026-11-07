"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile in front of sign-up, sign-in, code resend and password
// reset (check-2 #16). Off until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set in
// Vercel; then turn on Supabase → Auth → Bot and Abuse Protection with the
// matching secret key. A token works once: the form bumps resetKey after
// each request so a new one is fetched.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile could not load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function Captcha({
  onToken,
  resetKey,
  language,
}: {
  onToken: (token: string | null) => void;
  resetKey: number;
  language: "ka" | "en";
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    let widgetId: string | null = null;
    let active = true;
    onToken(null);

    void loadScript().then(() => {
      const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (!active || !turnstile || !box.current) return;
      widgetId = turnstile.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language,
        appearance: "interaction-only",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    });

    return () => {
      active = false;
      const turnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (widgetId && turnstile) turnstile.remove(widgetId);
    };
    // onToken is a state setter; re-render the widget only on reset/language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, language]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="flex justify-center empty:hidden" />;
}
