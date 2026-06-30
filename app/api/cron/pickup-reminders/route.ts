import { NextResponse } from "next/server";
import { sendDuePickupReminderEmails } from "@/lib/email/events";
import { logger } from "@/lib/logger";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const result = await sendDuePickupReminderEmails(supabase);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Pickup reminder cron failed", { error });
    return NextResponse.json(
      { ok: false, error: "Pickup reminders could not be sent." },
      { status: 500 }
    );
  }
}
