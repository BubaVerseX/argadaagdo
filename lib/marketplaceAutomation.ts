import { supabase } from "@/lib/supabase";

export async function processExpiredMarketplace() {
  const { error } = await supabase.rpc("process_expired_marketplace");

  if (error) {
    return;
  }
}
