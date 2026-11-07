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

// Fallback for when localStorage is unavailable (blocked site data, some
// private modes) — accessing it then throws, which would break every page.
let inMemoryLanguage: Language = defaultLanguage;

// A link can pick the language with ?lang=en or ?lang=ka (the store listings'
// account-deletion link, for one). It is saved like a choice in the switcher.
// Applied once per query string, so the switcher still works on that page.
let appliedUrlSearch: string | null = null;

function applyLanguageFromUrl() {
  const { search } = window.location;
  if (search === appliedUrlSearch) return;
  appliedUrlSearch = search;

  const requested = new URLSearchParams(search).get("lang");
  if (!isSupportedLanguage(requested)) return;

  inMemoryLanguage = requested;
  try {
    window.localStorage.setItem(languageStorageKey, requested);
  } catch {
    // inMemoryLanguage covers this visit.
  }
}

function readSavedLanguage(): Language {
  if (typeof window === "undefined") return defaultLanguage;

  applyLanguageFromUrl();

  try {
    const savedLanguage = window.localStorage.getItem(languageStorageKey);
    return isSupportedLanguage(savedLanguage) ? savedLanguage : defaultLanguage;
  } catch {
    return inMemoryLanguage;
  }
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

    inMemoryLanguage = nextLanguage;

    try {
      window.localStorage.setItem(languageStorageKey, nextLanguage);
    } catch {
      // Keep the in-memory choice for this session.
    }

    document.documentElement.lang = nextLanguage;
    window.dispatchEvent(new Event(languageChangeEvent));
  }

  function t(key: TranslationKey) {
    return translate(language, key);
  }

  return { language, setLanguage, t };
}
