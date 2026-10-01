"use client";

import type { Language } from "@/lib/i18n";
import {
  resolveLocalizedText,
  type LocalizedText,
} from "@/lib/localizedText";
import { useLanguage } from "@/lib/useLanguage";

type LoadingStateProps = {
  title?: LocalizedText;
  description?: LocalizedText;
  className?: string;
};

const defaultCopy: Record<Language, { title: string; description: string }> = {
  en: {
    title: "Loading ArGadaagdo...",
    description: "Preparing your marketplace view.",
  },
  ka: {
    title: "ArGadaagdo იტვირთება...",
    description: "მარკეტის ხედი მზადდება.",
  },
};

export function LoadingState({
  title,
  description,
  className = "",
}: LoadingStateProps) {
  const { language } = useLanguage();
  const resolvedTitle =
    title === undefined
      ? defaultCopy[language].title
      : resolveLocalizedText(title, language);
  const resolvedDescription =
    description === undefined
      ? defaultCopy[language].description
      : resolveLocalizedText(description, language);

  return (
    <div
      className={`premium-card w-full rounded-3xl p-6 text-center sm:rounded-[2rem] sm:p-10 ${className}`}
    >
      <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-[#f4efe4] sm:h-16 sm:w-16" />
      <h1 className="mt-5 text-2xl font-black text-[#2e2a22] sm:text-3xl">
        {resolvedTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-md font-semibold leading-7 text-[#6b6152]">
        {resolvedDescription}
      </p>
    </div>
  );
}
