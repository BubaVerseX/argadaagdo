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
      className="ui-well inline-flex rounded-full p-1"
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
            className={`flex min-h-11 items-center rounded-full px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint ${ active
                ? "ui-card text-mint"
                : "text-body hover:text-cream"
            }`}
          >
            {languageNames[option]}
          </button>
        );
      })}
    </div>
  );
}
