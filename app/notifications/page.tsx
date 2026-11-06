"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeNotificationsScreen } from "@/components/native/screens";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// An app screen only. A browser that lands here goes to /orders.
function WebRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders");
  }, [router]);

  return <main className="app-shell" />;
}

export default withNativeScreen(WebRedirect, NativeNotificationsScreen);
