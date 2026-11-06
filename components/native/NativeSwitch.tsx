"use client";

import { isNativeApp } from "@/lib/native";
import { isNativeScreenUrl } from "@/lib/nativeBoot";
import {
  Suspense,
  use,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The URL's ?full=1 changed inside the app: pages re-check which view they show. */
export function notifyNativeRouteChange() {
  listeners.forEach((listener) => listener());
}

const serverFalse = () => false;
// Never resolves: see WebHold.
const never = new Promise<never>(() => {});

function isNativeScreen() {
  return (
    isNativeApp() &&
    isNativeScreenUrl(window.location.pathname, window.location.search)
  );
}

// React hydrates the server's website HTML with "false" first, then switches to
// the app screen. Suspending here leaves that HTML dehydrated (it is hidden by
// CSS since before first paint), so the website page never mounts inside the
// app and none of its effects or requests run. In a browser it is a plain
// passthrough.
function WebHold({
  when,
  children,
}: {
  when: () => boolean;
  children: ReactNode;
}) {
  if (when()) use(never);
  return <>{children}</>;
}

function gate<P extends object>(
  Web: ComponentType<P>,
  Native: ComponentType<object>,
  when: () => boolean
) {
  return function NativeGated(props: P) {
    const native = useSyncExternalStore(subscribe, when, serverFalse);

    if (native) return <Native {...props} />;

    return (
      <Suspense fallback={null}>
        <WebHold when={when}>
          <Web {...props} />
        </WebHold>
      </Suspense>
    );
  };
}

/** A page: the app screen inside the native app, unless the URL has ?full=1. */
export function withNativeScreen<P extends object>(
  Web: ComponentType<P>,
  Native: ComponentType<object>
) {
  return gate(Web, Native, isNativeScreen);
}

/** Website chrome (header, footer): replaced anywhere inside the native app. */
export function withNativeChrome<P extends object>(
  Web: ComponentType<P>,
  Native: ComponentType<object>
) {
  return gate(Web, Native, isNativeApp);
}
