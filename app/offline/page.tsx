"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

export default function OfflinePage() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#d9d5cb] px-4 text-[#1a1815]">
      <div className="w-full max-w-md rounded-[1.75rem] bg-[#f2efe6] p-8 text-center shadow-[var(--shadow-soft)] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-[0_3px_16px_rgba(37,34,32,0.06)]">
          📡
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#6b6558]">
          {t("offline.badge")}
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-[#1a1815]">
          {t("offline.title")}
        </h1>

        <p className="mt-4 leading-[1.55] text-[#6b6558]">
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
