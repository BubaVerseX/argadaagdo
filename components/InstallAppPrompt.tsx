"use client";

import { useSyncExternalStore } from "react";
import { SmartphoneIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";

const DISMISS_KEY = "argadaagdo-install-dismissed";
const PROMPT_CHANGE_EVENT = "argadaagdo:install-prompt-change";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Visibility = "hidden" | "native-prompt" | "ios-hint";

let capturedPrompt: BeforeInstallPromptEvent | null = null;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function subscribe(onStoreChange: () => void) {
  function handleBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    capturedPrompt = event as BeforeInstallPromptEvent;
    onStoreChange();
  }

  function handleAppInstalled() {
    capturedPrompt = null;
    onStoreChange();
  }

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  window.addEventListener(PROMPT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
    window.removeEventListener(PROMPT_CHANGE_EVENT, onStoreChange);
  };
}

function getSnapshot(): Visibility {
  if (isStandalone() || window.localStorage.getItem(DISMISS_KEY) === "true") {
    return "hidden";
  }
  if (capturedPrompt) return "native-prompt";
  if (isIosSafari()) return "ios-hint";
  return "hidden";
}

function getServerSnapshot(): Visibility {
  return "hidden";
}

function dismiss() {
  window.localStorage.setItem(DISMISS_KEY, "true");
  capturedPrompt = null;
  window.dispatchEvent(new Event(PROMPT_CHANGE_EVENT));
}

async function install() {
  if (!capturedPrompt) return;
  await capturedPrompt.prompt();
  await capturedPrompt.userChoice;
  dismiss();
}

export default function InstallAppPrompt() {
  const { t } = useLanguage();
  const visibility = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (visibility === "hidden") return null;

  return (
    <div className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-[1.5rem] bg-[#2e2a22] p-4 text-white shadow-[var(--shadow-hero)] sm:bottom-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <SmartphoneIcon className="h-5 w-5" strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t("installApp.title")}</p>
          <p className="mt-1 text-xs leading-[1.5] text-white/70">
            {visibility === "native-prompt" ? t("installApp.text") : t("installApp.iosText")}
          </p>

          <div className="mt-3 flex gap-2">
            {visibility === "native-prompt" && (
              <button
                type="button"
                onClick={install}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-xs font-semibold text-[#2e2a22] transition hover:bg-[#ece4d6] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {t("installApp.install")}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-4 text-xs font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("installApp.dismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
