"use client";

import {
  languageNames,
  languageShortNames,
  supportedLanguages,
} from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      aria-label={t("language.switcherLabel")}
      className="inline-flex rounded-full border border-green-100 bg-white p-1 shadow-sm"
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
            className={`min-h-9 rounded-full px-3 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${
              active
                ? "bg-green-700 text-white"
                : "text-gray-600 hover:bg-green-50 hover:text-green-800"
            }`}
          >
            {languageShortNames[option]}
          </button>
        );
      })}
    </div>
  );
}
