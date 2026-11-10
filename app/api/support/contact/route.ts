import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { SUPPORT_EMAIL } from "@/lib/legal/shared";
import { logger } from "@/lib/logger";
import { formatTranscript, normalizeTranscript } from "@/lib/support/messages";
import { createRateLimiter, getClientIp } from "@/lib/support/rateLimit";
import { buildVisitorSummary, readSupportVisitor } from "@/lib/support/userContext";

// "Write to us" in the support chat: emails the conversation to the support
// inbox, with the visitor's email as Reply-To so the team answers by email.
// Nothing is stored on our side.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const perVisitorHour = createRateLimiter(4, 60 * 60 * 1000);
const perIpHour = createRateLimiter(8, 60 * 60 * 1000);

const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

function extractBearerToken(request: Request) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    email?: unknown;
    note?: unknown;
    language?: unknown;
    path?: unknown;
    app?: unknown;
  } | null;

  const ip = getClientIp(request);
  const { visitor, client } = await readSupportVisitor(extractBearerToken(request));

  const typedEmail = typeof body?.email === "string" ? body.email.trim().slice(0, 254) : "";
  const email = visitor.email || typedEmail;
  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }

  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const transcript = normalizeTranscript(body?.messages);
  if (!note && !transcript.some((message) => message.role === "user")) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  for (const check of [perIpHour(ip), perVisitorHour(visitor.userId ? `user:${visitor.userId}` : `email:${email.toLowerCase()}`)]) {
    if (!check.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: check.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(check.retryAfterSeconds) } }
      );
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.error("Support message not sent: RESEND_API_KEY is missing");
    return NextResponse.json({ error: "failed" }, { status: 503 });
  }

  const language = body?.language === "en" ? "en" : "ka";
  const path = typeof body?.path === "string" ? body.path.slice(0, 120) : "/";
  const summary = await buildVisitorSummary({
    visitor,
    client,
    language,
    path,
    isApp: body?.app === true,
  });

  const conversation = transcript.length
    ? formatTranscript(transcript, { user: "Visitor", assistant: "Assistant (AI)" })
    : "(no chat)";
  const text = [
    `From: ${email}${visitor.userId ? " (signed in)" : " (guest, typed email)"}`,
    note ? `\nMessage:\n${note}` : "",
    `\nChat:\n${conversation}`,
    `\n---\n${summary}`,
    visitor.userId ? `User ID: ${visitor.userId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const subjectSource = note || transcript.find((message) => message.role === "user")?.content || "";
  const subject = `Support chat: ${subjectSource.replace(/\s+/g, " ").slice(0, 70)}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `support-chat-${randomUUID()}`,
      },
      body: JSON.stringify({
        from: process.env.TRANSACTIONAL_EMAIL_FROM || "ArGadaagdo <onboarding@resend.dev>",
        to: [process.env.SUPPORT_INBOX_EMAIL || SUPPORT_EMAIL],
        reply_to: email,
        subject,
        text,
        html: `<pre style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(text)}</pre>`,
      }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      logger.error("Support message email failed", { status: response.status, error: result.message });
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }
  } catch (error) {
    logger.error("Support message email unreachable", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }

  logger.info("Support message sent", { signedIn: Boolean(visitor.userId) });
  return NextResponse.json({ ok: true });
}
