import { createClient } from "@supabase/supabase-js";

// Public marketplace reads for the app's cached API routes. Uses the anon key
// with no session, so RLS gives exactly what a signed-out visitor can see.
// Only public data may ever go through here: these responses are shared by
// everyone through the CDN.
export const FEED_LIMIT = 60;

export const PUBLIC_BUSINESS_COLUMNS = "name, address, business_type";

export function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
