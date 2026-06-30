import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import type { TransactionalEmailEvent } from "@/lib/email/templates";

type TriggerTransactionalEmailInput = {
  event: TransactionalEmailEvent;
  orderId?: number;
  businessId?: number;
};

export async function triggerTransactionalEmail({
  event,
  orderId,
  businessId,
}: TriggerTransactionalEmailInput) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      logger.warn("Transactional email trigger skipped without session", {
        event,
        orderId,
        businessId,
      });
      return { ok: false, skipped: true };
    }

    const response = await fetch("/api/email/transactional", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event, orderId, businessId }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      logger.warn("Transactional email trigger failed", {
        event,
        orderId,
        businessId,
        status: response.status,
        error: body.error,
      });
      return { ok: false, error: body.error };
    }

    return response.json() as Promise<{ ok: boolean }>;
  } catch (error) {
    logger.warn("Transactional email trigger failed", {
      event,
      orderId,
      businessId,
      error,
    });
    return { ok: false, error: "email_trigger_failed" };
  }
}
