import { createHmac, timingSafeEqual } from "node:crypto";

// Supabase signs auth hook requests with the Standard Webhooks scheme:
// base64(HMAC-SHA256(secret, "<id>.<timestamp>.<body>")).

const TOLERANCE_SECONDS = 5 * 60;

/** @param secret as Supabase shows it: "v1,whsec_<base64>". */
export function isValidStandardWebhook({
  secret,
  id,
  timestamp,
  signatureHeader,
  body,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signatureHeader: string | null;
  body: string;
  nowSeconds?: number;
}) {
  if (!secret || !id || !timestamp || !signatureHeader) return false;

  const sentAt = Number(timestamp);

  if (!Number.isFinite(sentAt) || Math.abs(nowSeconds - sentAt) > TOLERANCE_SECONDS) {
    return false;
  }

  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();

  // The header can list several space-separated signatures, like "v1,abc v1,def".
  return signatureHeader.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");

    if (version !== "v1" || !signature) return false;

    const provided = Buffer.from(signature, "base64");

    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
}
