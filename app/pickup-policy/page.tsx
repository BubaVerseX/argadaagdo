"use client";

import PolicyPage from "@/components/legal/PolicyPage";
import { pickupPolicyContent } from "@/lib/legal/policies";

export default function PickupPolicyPage() {
  return <PolicyPage content={pickupPolicyContent} path="/pickup-policy" />;
}
