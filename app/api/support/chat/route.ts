import { NextResponse } from "next/server";
import { askSupportModel, isSupportChatConfigured } from "@/lib/support/anthropic";
import { getSupportKnowledgePrompt } from "@/lib/support/knowledge";
import { normalizeSupportMessages } from "@/lib/support/messages";
import { createRateLimiter, getClientIp } from "@/lib/support/rateLimit";
import { buildVisitorSummary, readSupportVisitor } from "@/lib/support/userContext";

// The support chat's answers. The browser keeps the conversation and sends it
// with each question; nothing is stored here. Signed-in visitors send their
// session token so the answer can use their own orders or business.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const perVisitorBurst = createRateLimiter(12, 5 * 60 * 1000);
const perVisitorDay = createRateLimiter(120, 24 * 60 * 60 * 1000);
const perIp = createRateLimiter(40, 10 * 60 * 1000);
const perInstanceDay = createRateLimiter(4000, 24 * 60 * 60 * 1000);

function extractBearerToken(request: Request) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

/** Only pages of this site may call it (the apps load the site itself). */
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json(
    { enabled: isSupportChatConfigured() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isSupportChatConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    language?: unknown;
    path?: unknown;
    app?: unknown;
  } | null;

  const messages = normalizeSupportMessages(body?.messages);
  if (!messages) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const { visitor, client } = await readSupportVisitor(extractBearerToken(request));
  const visitorKey = visitor.userId ? `user:${visitor.userId}` : `ip:${ip}`;

  for (const check of [
    perIp(ip),
    perVisitorBurst(visitorKey),
    perVisitorDay(visitorKey),
    perInstanceDay("all"),
  ]) {
    if (!check.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: check.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(check.retryAfterSeconds) } }
      );
    }
  }

  const language = body?.language === "en" ? "en" : "ka";
  const path = typeof body?.path === "string" ? body.path.slice(0, 120) : "/";

  const visitorSummary = await buildVisitorSummary({
    visitor,
    client,
    language,
    path,
    isApp: body?.app === true,
  });

  const reply = await askSupportModel({
    knowledge: getSupportKnowledgePrompt(),
    visitorSummary,
    messages,
  });

  if (!reply.ok) {
    const status = reply.reason === "not_configured" ? 503 : reply.reason === "busy" ? 503 : 502;
    return NextResponse.json({ error: reply.reason }, { status });
  }

  return NextResponse.json(
    { reply: reply.text },
    { headers: { "Cache-Control": "no-store" } }
  );
}
