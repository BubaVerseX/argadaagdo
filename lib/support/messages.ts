// Cleans the conversation the browser sends before it goes to the model or
// into an email. The browser keeps the chat; the server stores nothing.

export type SupportChatRole = "user" | "assistant";

export type SupportChatMessage = {
  role: SupportChatRole;
  content: string;
};

export const MAX_USER_MESSAGE_LENGTH = 1000;
const MAX_ASSISTANT_MESSAGE_LENGTH = 3000;
/** Only the latest turns are sent: enough context, bounded cost. */
const MAX_MESSAGES = 16;

function clean(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function collectTurns(input: unknown) {
  const turns: SupportChatMessage[] = [];
  if (!Array.isArray(input)) return turns;

  for (const item of input.slice(-40)) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;

    const text = clean(
      content,
      role === "user" ? MAX_USER_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_LENGTH
    );
    if (!text) continue;

    const previous = turns[turns.length - 1];
    if (previous?.role === role) {
      previous.content = `${previous.content}\n\n${text}`.slice(
        0,
        role === "user" ? MAX_USER_MESSAGE_LENGTH * 2 : MAX_ASSISTANT_MESSAGE_LENGTH
      );
    } else {
      turns.push({ role, content: text });
    }
  }

  return turns;
}

/**
 * Returns alternating user/assistant turns that start and end with the user,
 * or null when there is nothing valid to answer.
 */
export function normalizeSupportMessages(input: unknown): SupportChatMessage[] | null {
  const turns = collectTurns(input);

  while (turns.length > 0 && turns[turns.length - 1].role !== "user") turns.pop();

  let recent = turns.slice(-MAX_MESSAGES);
  while (recent.length > 0 && recent[0].role !== "user") recent = recent.slice(1);

  return recent.length > 0 ? recent : null;
}

/** The whole cleaned conversation (latest 40 messages), for the support email. */
export function normalizeTranscript(input: unknown): SupportChatMessage[] {
  return collectTurns(input);
}

/** Plain-text transcript for the support email. */
export function formatTranscript(messages: SupportChatMessage[], labels: { user: string; assistant: string }) {
  return messages
    .map((message) => `${message.role === "user" ? labels.user : labels.assistant}:\n${message.content}`)
    .join("\n\n");
}

/**
 * Georgian is written without capitals, but models sometimes start a sentence
 * with a Mtavruli letter (U+1C90–U+1CBF). Map those to the normal letters.
 */
export function toMkhedruli(text: string) {
  return text.replace(/[\u1C90-\u1CBA\u1CBD-\u1CBF]/g, (letter) =>
    String.fromCharCode(letter.charCodeAt(0) - 0x1c90 + 0x10d0)
  );
}
