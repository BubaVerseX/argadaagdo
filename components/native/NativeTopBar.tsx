"use client";

import { ArrowLeftIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/** Back button and title for the app's secondary screens. */
export default function NativeTopBar({
  title,
  fallbackHref = "/profile",
  action,
}: {
  title: string;
  /** Where Back goes when the screen was opened directly. */
  fallbackHref?: string;
  action?: ReactNode;
}) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <header className="native-topbar sticky top-[var(--safe-area-inset-top,env(safe-area-inset-top,0px))] z-40 flex items-center gap-3 px-4 py-2">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.replace(fallbackHref);
        }}
        aria-label={t("native.back")}
        className="native-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card text-cream"
      >
        <ArrowLeftIcon className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold text-cream">
        {title}
      </h1>
      {action}
    </header>
  );
}
