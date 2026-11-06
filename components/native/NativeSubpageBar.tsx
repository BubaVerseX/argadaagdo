"use client";

import { ArrowLeftIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Stands in for the website header on pages without their own app screen
// (login, settings, FAQ...). Navbar props don't apply here.
export default function NativeSubpageBar() {
  const router = useRouter();
  const { t } = useLanguage();

  // Links like /business/dashboard?full=1#create-offer point into content that
  // loads after the page opens, so the browser's own jump finds nothing.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;

    let tries = 0;
    const timer = window.setInterval(() => {
      const target = document.getElementById(id);
      tries += 1;
      if (target) target.scrollIntoView();
      if (target || tries > 30) window.clearInterval(timer);
    }, 200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div data-native-subpage-bar className="native-topbar theme-forest sticky top-[var(--safe-area-inset-top,env(safe-area-inset-top,0px))] z-50 px-4 py-2">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.replace("/");
        }}
        aria-label={t("native.back")}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-cream"
      >
        <ArrowLeftIcon className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
    </div>
  );
}
