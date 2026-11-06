"use client";

import { LEAF_MARK_SVG } from "@/lib/nativeLaunch";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useState } from "react";
import Link from "./AppLink";
import { markWelcomeSeen } from "@/lib/accountGate";

// Welcome · Quiet green (docs/design-v3/first-screen.html, W1): the same leaf
// mark as the launch animation at the top, only the name, two buttons and a
// small language switch. First app start only: "Get started" opens Nearby as
// a guest, "Sign in" the sign-in screen.
// Right after the launch the mark is already drawn, so the launch flows
// straight into this screen; otherwise the mark draws itself.
export default function NativeWelcome({ onStart }: { onStart: () => void }) {
  const { language, setLanguage } = useLanguage();
  const ka = language === "ka";
  const [afterLaunch] = useState(() => document.documentElement.classList.contains("native-launch"));

  // No tab bar on this screen (app/native.css).
  useEffect(() => {
    document.documentElement.classList.add("native-welcome");
    return () => document.documentElement.classList.remove("native-welcome");
  }, []);

  return (
    <main className={`native-main native-welcome-screen ${afterLaunch ? "is-after-launch" : ""}`}>
      <button
        type="button"
        onClick={() => setLanguage(ka ? "en" : "ka")}
        aria-label={ka ? "Switch to English" : "ქართულზე გადართვა"}
        className="native-welcome-lang"
      >
        {ka ? "KA" : "EN"}
      </button>

      <div className="native-welcome-ui">
        <span
          className={`native-welcome-mark ${afterLaunch ? "leaf-mark--still" : ""}`}
          dangerouslySetInnerHTML={{ __html: LEAF_MARK_SVG }}
        />
        <h1 className="native-welcome-name">{ka ? "არ გადააგდო" : "ArGadaagdo"}</h1>
        <div className="flex-1" />
        <div className="native-welcome-buttons">
          <button type="button" onClick={onStart} className="native-press native-welcome-primary">
            {ka ? "დაწყება" : "Get started"}
          </button>
          <Link href="/login?tab=signin" onClick={markWelcomeSeen} className="native-press native-welcome-secondary">
            {ka ? "შესვლა" : "Sign in"}
          </Link>
        </div>
      </div>
    </main>
  );
}
