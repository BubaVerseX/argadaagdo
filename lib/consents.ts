import { supabase } from "@/lib/supabase";

// Consent records (private.consent_events, 20261107120000_consents.sql). The
// version names the text the person agreed to; bump it when that text changes
// in a way that needs a new consent.
export const DATA_TRANSFER_CONSENT_VERSION = "2026-11-07";
export const PUSH_CONSENT_VERSION = "2026-11-07";
export const BUSINESS_TERMS_VERSION = "2026-11-07";

export type ConsentKind = "data_transfer" | "push_orders" | "push_new_boxes" | "business_terms";

export type ConsentRecord = {
  kind: ConsentKind;
  version: string;
  granted: boolean;
  created_at: string;
};

export async function getMyConsents(): Promise<ConsentRecord[] | null> {
  const { data, error } = await supabase.rpc("get_my_consents");
  if (error) return null;
  return (data || []) as ConsentRecord[];
}

export async function recordConsent(
  kind: ConsentKind,
  version: string,
  granted: boolean,
  source?: string
) {
  const { error } = await supabase.rpc("record_my_consent", {
    p_kind: kind,
    p_version: version,
    p_granted: granted,
    p_source: source ?? null,
  });
  return !error;
}
