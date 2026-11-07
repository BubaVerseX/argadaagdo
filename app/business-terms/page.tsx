"use client";

import PolicyPage from "@/components/legal/PolicyPage";
import { businessTermsContent } from "@/lib/legal/businessTerms";

export default function BusinessTermsPage() {
  return <PolicyPage content={businessTermsContent} path="/business-terms" />;
}
