// ubill.ge SMS API: https://ubill.ge/api-docs. Server-side only.

// The hook has 5 seconds in total, including the trip from Supabase to here.
const SEND_TIMEOUT_MS = 3500;

export class SmsSendError extends Error {}

/** @param phone international format without "+", for example 9955XXXXXXXX. */
export async function sendOtpSms(phone: string, text: string) {
  const apiKey = process.env.UBILL_API_KEY;
  const brandId = process.env.UBILL_BRAND_ID;
  const baseUrl = process.env.UBILL_API_URL || "https://api.ubill.dev";

  if (!apiKey || !brandId) {
    throw new SmsSendError("ubill.ge is not configured");
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/v1/sms/send`, {
      method: "POST",
      headers: { key: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        brandID: Number(brandId),
        numbers: [phone],
        text,
        otp: true,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    throw new SmsSendError(
      `ubill.ge request failed: ${error instanceof Error ? error.name : "unknown"}`
    );
  }

  const result = (await response.json().catch(() => null)) as {
    statusID?: number;
    message?: string;
  } | null;

  // statusID decides the result; 0 means sent.
  if (!response.ok || result?.statusID !== 0) {
    throw new SmsSendError(
      `ubill.ge rejected the SMS: HTTP ${response.status}, status ${result?.statusID ?? "none"}`
    );
  }
}
