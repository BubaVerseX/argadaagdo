import { logger } from "@/lib/logger";
import {
  buildTransactionalEmailTemplate,
  type TransactionalEmailEvent,
  type TransactionalEmailPayload,
} from "@/lib/email/templates";

type SendTransactionalEmailInput = {
  to: string | string[];
  event: TransactionalEmailEvent;
  payload: TransactionalEmailPayload;
  idempotencyKey: string;
};

export type TransactionalEmailSendResult = {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
};

type ResendResponseBody = {
  id?: string;
  message?: string;
  name?: string;
};

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const MAX_EMAIL_ATTEMPTS = 3;

function getTransactionalEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || "",
    enabled: process.env.TRANSACTIONAL_EMAILS_ENABLED !== "false",
    from:
      process.env.TRANSACTIONAL_EMAIL_FROM ||
      "ArGadaagdo <onboarding@resend.dev>",
    replyTo: process.env.TRANSACTIONAL_EMAIL_REPLY_TO || undefined,
  };
}

function normalizeRecipients(to: string | string[]) {
  return (Array.isArray(to) ? to : [to])
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function shouldRetry(status: number) {
  return status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResendBody(response: Response) {
  try {
    return (await response.json()) as ResendResponseBody;
  } catch {
    return {};
  }
}

export async function sendTransactionalEmail({
  to,
  event,
  payload,
  idempotencyKey,
}: SendTransactionalEmailInput): Promise<TransactionalEmailSendResult> {
  const recipients = normalizeRecipients(to);
  const config = getTransactionalEmailConfig();

  if (recipients.length === 0) {
    logger.warn("Transactional email skipped because recipient is missing", {
      event,
      idempotencyKey,
    });
    return { ok: false, skipped: true, error: "missing_recipient" };
  }

  if (!config.enabled) {
    logger.info("Transactional email skipped because sending is disabled", {
      event,
      idempotencyKey,
    });
    return { ok: true, skipped: true };
  }

  if (!config.apiKey) {
    logger.warn("Transactional email skipped because RESEND_API_KEY is missing", {
      event,
      idempotencyKey,
    });
    return { ok: false, skipped: true, error: "missing_resend_api_key" };
  }

  const template = buildTransactionalEmailTemplate(event, payload);
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_EMAIL_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(RESEND_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from: config.from,
          to: recipients,
          subject: template.subject,
          html: template.html,
          text: template.text,
          ...(config.replyTo ? { reply_to: config.replyTo } : {}),
        }),
      });

      const responseBody = await readResendBody(response);

      if (response.ok) {
        logger.info("Transactional email sent", {
          event,
          idempotencyKey,
          resendId: responseBody.id,
          recipients: recipients.length,
        });

        return { ok: true, id: responseBody.id };
      }

      lastError =
        responseBody.message ||
        responseBody.name ||
        `Resend responded with ${response.status}`;

      logger.warn("Transactional email provider attempt failed", {
        event,
        idempotencyKey,
        attempt,
        status: response.status,
        error: lastError,
      });

      if (!shouldRetry(response.status)) {
        return { ok: false, error: lastError };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown email error";
      logger.warn("Transactional email attempt failed", {
        event,
        idempotencyKey,
        attempt,
        error: lastError,
      });
    }

    if (attempt < MAX_EMAIL_ATTEMPTS) {
      await wait(250 * attempt);
    }
  }

  logger.error("Transactional email failed after retries", {
    event,
    idempotencyKey,
    error: lastError,
  });

  return { ok: false, error: lastError || "email_send_failed" };
}
