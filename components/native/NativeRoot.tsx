"use client";

import { isNativeApp } from "@/lib/native";
import { useSyncExternalStore } from "react";
import { NativeShell } from "./screens";

const subscribe = () => () => {};
const serverFalse = () => false;

/** Mounted once in the root layout. Renders nothing in a normal browser. */
export default function NativeRoot() {
  const native = useSyncExternalStore(subscribe, isNativeApp, serverFalse);
  return native ? <NativeShell /> : null;
}
