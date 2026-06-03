"use client";

import {
  defaultLanguage,
  isSupportedLanguage,
  translate,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";
import { useEffect, useSyncExternalStore } from "react";

const languageStorageKey = "argadaagdo-language";
const languageChangeEvent = "argadaagdo:language-change";

function readSavedLanguage(): Language {
  if (typeof window === "undefined") return defaultLanguage;

  const savedLanguage = window.localStorage.getItem(languageStorageKey);
  return isSupportedLanguage(savedLanguage) ? savedLanguage : defaultLanguage;
}

function subscribeToLanguageChanges(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(languageChangeEvent, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(languageChangeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLanguage() {
  const language = useSyncExternalStore(
    subscribeToLanguageChanges,
    readSavedLanguage,
    () => defaultLanguage
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(nextLanguage: Language) {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(languageStorageKey, nextLanguage);
    document.documentElement.lang = nextLanguage;
    window.dispatchEvent(new Event(languageChangeEvent));
  }

  function t(key: TranslationKey) {
    return translate(language, key);
  }

  return { language, setLanguage, t };
}
