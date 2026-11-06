"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativeMapScreen } from "@/components/native/screens";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// An app tab only. The website has no link here; a browser that lands on it
// goes to the website's offer list.
function WebMapRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/discover");
  }, [router]);

  return <main className="app-shell" />;
}

export default withNativeScreen(WebMapRedirect, NativeMapScreen);
