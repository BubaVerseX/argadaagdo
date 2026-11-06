"use client";

import { withNativeScreen } from "@/components/native/NativeSwitch";
import { NativePaymentScreen } from "@/components/native/screens";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// An app screen only. A browser that lands here goes to /faq.
function WebRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/faq");
  }, [router]);

  return <main className="app-shell" />;
}

export default withNativeScreen(WebRedirect, NativePaymentScreen);
