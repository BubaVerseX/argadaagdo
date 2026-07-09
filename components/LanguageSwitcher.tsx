"use client";

import {
  languageNames,
  supportedLanguages,
} from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      aria-label={t("language.switcherLabel")}
      className="inline-flex rounded-full border border-black/[0.06] bg-white p-1 shadow-[0_3px_16px_rgba(37,34,32,0.06)]"
      role="group"
    >
      {supportedLanguages.map((option) => {
        const active = option === language;

        return (
          <button
            key={option}
            type="button"
            onClick={() => setLanguage(option)}
            aria-pressed={active}
            aria-label={languageNames[option]}
            className={`min-h-9 rounded-full px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c7a5c] ${
              active
                ? "bg-[#5c7a5c] text-white"
                : "text-[#6b6558] hover:bg-[#5c7a5c]/10 hover:text-[#1a1815]"
            }`}
          >
            {languageNames[option]}
          </button>
        );
      })}
    </div>
  );
}
