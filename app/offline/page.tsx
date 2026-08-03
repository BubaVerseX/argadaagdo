"use client";

import Link from "next/link";
import { WifiOffIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";

export default function OfflinePage() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ece4d6] px-4 text-[#2e2a22]">
      <div className="soft-raised w-full max-w-md rounded-[1.75rem] p-8 text-center sm:p-10">
        <div className="soft-pressed mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <WifiOffIcon className="h-7 w-7 text-[#a67c52]" strokeWidth={1.6} />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#6b6152]">
          {t("offline.badge")}
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-[#2e2a22]">
          {t("offline.title")}
        </h1>

        <p className="mt-4 leading-[1.55] text-[#6b6152]">
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
