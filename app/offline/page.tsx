"use client";

import Link from "next/link";
import { WifiOffIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";

export default function OfflinePage() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 text-cream">
      <div className="ui-card w-full max-w-md rounded-[22px] p-8 text-center sm:p-10">
        <div className="ui-well mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <WifiOffIcon className="h-7 w-7 text-mint" strokeWidth={1.6} />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.22em] text-body">
          {t("offline.badge")}
        </p>

        <h1 className="mt-3 text-3xl font-semibold text-cream">
          {t("offline.title")}
        </h1>

        <p className="mt-4 leading-[1.55] text-body">
          {t("offline.text")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="premium-button px-8 py-3.5"
          >
            {t("offline.retry")}
          </button>
          <Link href="/" className="premium-button-secondary px-8 py-3.5">
            {t("offline.home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
