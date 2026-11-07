"use client";

import { getAppVersionLabel } from "@/lib/appLinks";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useState } from "react";

/** The app version at the bottom of Settings (e.g. "v 1.0.1 (9)"). */
export default function AppVersionLine() {
  const { language } = useLanguage();
  const [version, setVersion] = useState("");

  useEffect(() => {
    void getAppVersionLabel().then(setVersion);
  }, []);

  if (!version) return null;

  return (
    <p
      className="pb-2 pt-4 text-center text-xs text-muted"
      aria-label={language === "ka" ? `ვერსია ${version}` : `Version ${version}`}
    >
      v {version}
    </p>
  );
}
