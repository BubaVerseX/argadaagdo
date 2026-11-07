"use client";

import { translate, type Language } from "@/lib/i18n";
import { useEffect } from "react";

/**
 * The browser tab title in the language on screen. Page metadata is fixed at
 * build time, so client-rendered pages set the title once the language is
 * known (and again when it changes).
 */
export function useDocumentTitle(title: string, language: Language) {
  useEffect(() => {
    // Legal titles carry soft hyphens for line breaks; a tab title doesn't.
    const cleanTitle = title.replace(/­/g, "").trim();
    if (!cleanTitle) return;

    document.title = `${cleanTitle} | ${translate(language, "brand.name")}`;
  }, [title, language]);
}
