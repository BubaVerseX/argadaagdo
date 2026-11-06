"use client";

import { ArrowLeftIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import NativeHero from "./NativeHero";

/** Back button and title for the app's secondary screens, on the green header. */
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
    <NativeHero className="flex items-center gap-3 px-4 pb-2 pt-2.5">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.replace(fallbackHref);
        }}
        aria-label={t("native.back")}
        className="native-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-cream"
      >
        <ArrowLeftIcon className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      <h1 className="min-w-0 flex-1 truncate font-serif text-[1.25rem] font-bold text-cream">
        {title}
      </h1>
      {action}
    </NativeHero>
  );
}
