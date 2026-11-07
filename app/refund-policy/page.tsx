"use client";

import PolicyPage from "@/components/legal/PolicyPage";
import { refundPolicyContent } from "@/lib/legal/policies";

export default function RefundPolicyPage() {
  return <PolicyPage content={refundPolicyContent} path="/refund-policy" />;
}
