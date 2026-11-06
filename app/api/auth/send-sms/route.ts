import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isValidStandardWebhook } from "@/lib/sms/standardWebhook";
import { sendOtpSms, SmsSendError } from "@/lib/sms/ubill";

// Supabase's Send SMS hook. Auth calls this instead of a built-in SMS provider.
// It accepts Georgian numbers and accounts that already have an email, so nobody
// can run up the SMS bill with foreign numbers or phone-only signups.

type SendSmsPayload = {
  user?: {
    email?: string | null;
    phone?: string | null;
    // Set while a phone change is waiting for its code.
    phone_change?: string | null;
    new_phone?: string | null;
  };
  sms?: { otp?: string };
};

function hookError(message: string, status: number) {
  return NextResponse.json(
    { error: { http_code: status, message } },
    { status }
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signatureValid = isValidStandardWebhook({
    secret: process.env.SEND_SMS_HOOK_SECRET || "",
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signatureHeader: request.headers.get("webhook-signature"),
    body,
  });

  if (!signatureValid) {
    return hookError("Invalid signature", 401);
  }

  let payload: SendSmsPayload;

  try {
    payload = JSON.parse(body) as SendSmsPayload;
  } catch {
    return hookError("Invalid payload", 400);
  }

  const phone = (
    payload.user?.phone_change ||
    payload.user?.new_phone ||
    payload.user?.phone ||
    ""
  ).replace(/^\+/, "");
  const otp = payload.sms?.otp || "";

  if (!otp || !/^9955[0-9]{8}$/.test(phone)) {
    return hookError("Only Georgian mobile numbers are supported", 400);
  }

  if (!payload.user?.email) {
    return hookError("Phone-only accounts are not supported", 400);
  }

  try {
    // Latin letters: Georgian text cuts one SMS from 160 characters to 70.
    await sendOtpSms(phone, `ArGadaagdo code: ${otp}`);
  } catch (error) {
    logger.error("OTP SMS could not be sent", {
      error: error instanceof SmsSendError ? error.message : error,
    });
    return hookError("SMS could not be sent", 500);
  }

  return NextResponse.json({});
}
