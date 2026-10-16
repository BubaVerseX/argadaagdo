import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

let realtimeChannelSequence = 0;

// supabase.channel(topic) returns the existing channel when one with the same
// topic is still registered, and removeChannel() only unregisters it after an
// async round trip. Re-subscribing with a fixed topic (effect re-run, quick
// remount) therefore gets the channel that is still leaving, and live updates
// silently stop. A per-subscription suffix avoids that.
export function uniqueChannelName(baseName: string) {
  realtimeChannelSequence += 1;
  return `${baseName}-${realtimeChannelSequence}`;
}
