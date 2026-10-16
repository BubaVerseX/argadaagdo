import { timingSafeEqual } from "crypto";

// Constant-time check of `Authorization: Bearer <secret>` for server-only
// routes (Vercel cron, detailed health). Fails closed when the secret isn't
// configured.
export function isBearerSecretAuthorized(
  request: Request,
  secret: string | undefined
) {
  if (!secret) return false;

  const provided = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);

  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}
