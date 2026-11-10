// Small in-memory limits for the support chat. Each server instance keeps its
// own counts, so they are a brake on runaway use (a stuck loop, one person
// flooding), not an exact quota. The real spending cap is the monthly limit on
// the Anthropic account.

type Window = { count: number; resetAt: number };

const MAX_KEYS = 5000;

export function createRateLimiter(limit: number, windowMs: number) {
  const windows = new Map<string, Window>();

  return function take(key: string, now = Date.now()) {
    const current = windows.get(key);

    if (!current || current.resetAt <= now) {
      if (windows.size >= MAX_KEYS) {
        for (const [storedKey, stored] of windows) {
          if (stored.resetAt <= now) windows.delete(storedKey);
        }
        // Still full: drop the oldest entry rather than grow without bound.
        if (windows.size >= MAX_KEYS) {
          const oldest = windows.keys().next().value;
          if (oldest !== undefined) windows.delete(oldest);
        }
      }
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }

    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

/** The visitor's IP as Vercel reports it, for guests' limits. */
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return (
    forwarded.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
