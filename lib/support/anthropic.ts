import { logger } from "@/lib/logger";
import type { SupportChatMessage } from "@/lib/support/messages";

// One call to the Claude Messages API, without an SDK (one fetch). The fixed
// knowledge is the first system block and is cached; the visitor summary is
// the second block and changes every time.

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2026-10-21";
const FALLBACK_ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_OUTPUT_TOKENS = 700;
const TIMEOUT_MS = 25_000;

export function isSupportChatConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.SUPPORT_CHAT_ENABLED !== "false";
}

type AnthropicResponse = {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  error?: { type?: string; message?: string };
};

export type SupportReply =
  | { ok: true; text: string }
  | { ok: false; reason: "not_configured" | "busy" | "failed" };

async function post(body: Record<string, unknown>, apiKey: string, version = ANTHROPIC_VERSION) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": version,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as AnthropicResponse;
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function askSupportModel({
  knowledge,
  visitorSummary,
  messages,
}: {
  knowledge: string;
  visitorSummary: string;
  messages: SupportChatMessage[];
}): Promise<SupportReply> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || process.env.SUPPORT_CHAT_ENABLED === "false") {
    return { ok: false, reason: "not_configured" };
  }

  const effort = process.env.SUPPORT_CHAT_EFFORT ?? "low";
  const body: Record<string, unknown> = {
    model: process.env.SUPPORT_CHAT_MODEL || DEFAULT_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [
      { type: "text", text: knowledge, cache_control: { type: "ephemeral" } },
      { type: "text", text: visitorSummary },
    ],
    messages,
    ...(effort ? { output_config: { effort } } : {}),
  };

  try {
    let { status, data } = await post(body, apiKey);

    // An older API version still answers if this one were ever refused.
    if (status === 400 && /anthropic-version|api version/i.test(data.error?.message || "")) {
      ({ status, data } = await post(body, apiKey, FALLBACK_ANTHROPIC_VERSION));
    }

    // If this model doesn't take the effort setting, ask again without it.
    if (status === 400 && body.output_config && /output_config|effort/i.test(data.error?.message || "")) {
      delete body.output_config;
      ({ status, data } = await post(body, apiKey));
    }

    if (status === 429 || status === 529 || status >= 500) {
      logger.warn("Support chat model busy", { status, type: data.error?.type });
      return { ok: false, reason: "busy" };
    }

    if (status !== 200) {
      logger.error("Support chat model request failed", {
        status,
        type: data.error?.type,
        message: data.error?.message,
      });
      return { ok: false, reason: "failed" };
    }

    const text = (data.content || [])
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n")
      .trim();

    // Token counts only, never the conversation.
    logger.info("Support chat answered", {
      inputTokens: data.usage?.input_tokens,
      cacheRead: data.usage?.cache_read_input_tokens,
      cacheWrite: data.usage?.cache_creation_input_tokens,
      outputTokens: data.usage?.output_tokens,
      stopReason: data.stop_reason,
    });

    return text ? { ok: true, text } : { ok: false, reason: "failed" };
  } catch (error) {
    logger.warn("Support chat model unreachable", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, reason: "busy" };
  }
}
