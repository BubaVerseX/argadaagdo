import { supabase } from "@/lib/supabase";
import { logAppError } from "@/lib/errors";

export async function processExpiredMarketplace() {
  const { error } = await supabase.rpc("process_expired_marketplace");

  if (error) {
    logAppError("Expired marketplace processing failed", error, {
      operation: "process_expired_marketplace",
    });
  }
}
