"use client";

import { PhoneVerification } from "@/components/PhoneVerification";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";

/** One-time step before the first reservation: confirm a phone by SMS. */
export default function PhoneGate({ onVerified }: { onVerified: () => void }) {
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);

  return (
    <section className="grid gap-3 rounded-[22px] bg-card p-4">
      <h2 className="text-[17px] font-semibold text-cream">
        {L("დაადასტურე ნომერი – ერთხელ", "Confirm your number – once")}
      </h2>
      <p className="text-xs leading-5 text-body">
        {L("SMS კოდით. ერთი ნომერი — ერთი ანგარიში.", "By SMS code. One number, one account.")}
      </p>
      <PhoneVerification
        onVerified={() => {
          // Pick up the confirmed phone in the stored session, then go on.
          void supabase.auth.refreshSession().finally(onVerified);
        }}
      />
    </section>
  );
}
