"use client";

import { ACCOUNT_NEEDED_EVENT } from "@/lib/accountGate";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useState } from "react";
import Link from "./AppLink";

// The small sheet a guest sees when something needs an account (reserve,
// favourite, Orders, Profile, notifications). Mounted once by NativeShell.
export default function AccountSheet() {
  const { language } = useLanguage();
  const ka = language === "ka";
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ redirect?: string }>).detail;
      setRedirect(detail?.redirect || "/");
    };
    window.addEventListener(ACCOUNT_NEEDED_EVENT, open);
    return () => window.removeEventListener(ACCOUNT_NEEDED_EVENT, open);
  }, []);

  if (!redirect) return null;
  const close = () => setRedirect(null);
  const to = (tab: "signup" | "signin") => `/login?tab=${tab}&redirect=${encodeURIComponent(redirect)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-sheet-title"
      className="fixed inset-0 z-[75] flex items-end bg-black/40"
      onClick={close}
    >
      <div
        className="native-sheet w-full rounded-t-[28px] bg-[#fbf7ee] px-6 pb-[calc(1.25rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-5 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-10 rounded-full bg-[rgba(15,58,50,0.15)]" />
        <h2 id="account-sheet-title" className="text-lg font-semibold text-cream">
          {ka ? "ამისთვის ანგარიში გჭირდება" : "You'll need an account for this"}
        </h2>
        <div className="mt-4 grid gap-2">
          <Link
            href={to("signup")}
            onClick={close}
            className="native-press flex min-h-12 items-center justify-center rounded-2xl bg-brand-forest text-[15px] font-semibold text-brand-ground"
          >
            {ka ? "ანგარიშის შექმნა" : "Create account"}
          </Link>
          <Link
            href={to("signin")}
            onClick={close}
            className="native-press flex min-h-12 items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-cream"
          >
            {ka ? "შესვლა" : "Sign in"}
          </Link>
          <button type="button" onClick={close} className="min-h-11 text-sm font-medium text-body">
            {ka ? "ახლა არა" : "Not now"}
          </button>
        </div>
      </div>
    </div>
  );
}
