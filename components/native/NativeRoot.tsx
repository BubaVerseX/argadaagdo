"use client";

import { NATIVE_APP_COOKIE } from "@/lib/businessArea";
import { isNativeApp, markNativeAppForServer } from "@/lib/native";
import { useEffect, useSyncExternalStore } from "react";
import { NativeShell } from "./screens";

const subscribe = () => () => {};
const serverFalse = () => false;

/** Mounted once in the root layout. Renders nothing in a normal browser. */
export default function NativeRoot() {
  const native = useSyncExternalStore(subscribe, isNativeApp, serverFalse);

  useEffect(() => {
    if (native) markNativeAppForServer(NATIVE_APP_COOKIE);
  }, [native]);

  return native ? <NativeShell /> : null;
}
