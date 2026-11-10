"use client";

import { ArrowUpIcon, ChatIcon, XIcon } from "@/components/icons";
import { getProfileById } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import { isNativeApp } from "@/lib/native";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// The floating help chat on every page of the website and the app (mounted
// once in app/layout.tsx). Answers come from /api/support/chat; "Write to us"
// emails the conversation to the team through /api/support/contact. The
// conversation lives in this tab only (sessionStorage), never on our server.

type ChatMessage = { role: "user" | "assistant"; content: string };
type Mode = "chat" | "write" | "sent";
type Account = { email: string | null; role: string };

/** Other parts of the site can open the chat: window.dispatchEvent(new Event(...)). */
export const OPEN_SUPPORT_CHAT_EVENT = "argadaagdo:open-support-chat";

// Pages with their own bottom action bar, and the team/staff tools.
const HIDDEN_ON = /^\/(offers\/|checkout\/|staff(\/|$)|admin(\/|$)|offline)/;
const STORAGE_KEY = "argadaagdo-support-chat";
const MAX_LENGTH = 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const subscribeNothing = () => () => {};

function readStoredMessages(): ChatMessage[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item): item is ChatMessage =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string"
          )
          .slice(-40)
      : [];
  } catch {
    return [];
  }
}

function storeMessages(messages: ChatMessage[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // The chat still works for this page view.
  }
}

async function authHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {
    // A guest question.
  }
  return headers;
}

export default function SupportChat() {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const pathname = usePathname() || "/";
  const { language, t } = useLanguage();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    typeof window === "undefined" ? [] : readStoredMessages()
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [writeEmail, setWriteEmail] = useState("");
  const [writeNote, setWriteNote] = useState("");
  const [writeError, setWriteError] = useState<TranslationKey | null>(null);
  const [writeSending, setWriteSending] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  // Opened from elsewhere (the Help page's button).
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(OPEN_SUPPORT_CHAT_EVENT, openChat);
    return () => window.removeEventListener(OPEN_SUPPORT_CHAT_EVENT, openChat);
  }, []);

  // On opening: whether instant answers are on, and who is asking.
  useEffect(() => {
    if (!open) return;
    let active = true;

    if (enabled === null) {
      void fetch("/api/support/chat", { cache: "no-store" })
        .then((response) => response.json())
        .then((data: { enabled?: boolean }) => {
          if (!active) return;
          setEnabled(data.enabled === true);
          if (data.enabled !== true) setMode((current) => (current === "chat" ? "write" : current));
        })
        .catch(() => {
          if (active) setEnabled(true);
        });
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        if (active) setAccount(null);
        return;
      }
      const profile = await getProfileById(user.id).catch(() => null);
      if (active) setAccount({ email: user.email || null, role: profile?.role || "customer" });
    });

    return () => {
      active = false;
    };
  }, [open, enabled]);

  useEffect(() => {
    storeMessages(messages);
  }, [messages]);

  // Keeps the newest message in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending, error, open, mode]);

  // Focus the box on computers only; on phones the keyboard would cover the answer.
  useEffect(() => {
    if (!open || mode !== "chat") return;
    if (window.matchMedia?.("(pointer: fine)").matches) inputRef.current?.focus();
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted || HIDDEN_ON.test(pathname)) return null;

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    if (content.length > MAX_LENGTH) {
      setError("supportChat.errorTooLong");
      return;
    }

    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ messages: next, language, path: pathname, app: isNativeApp() }),
      });
      const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };

      if (response.ok && typeof data.reply === "string") {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      } else if (response.status === 429) {
        setError("supportChat.errorLimit");
      } else if (data.error === "not_configured") {
        setEnabled(false);
        setMode("write");
      } else {
        setError("supportChat.errorBusy");
      }
    } catch {
      setError("supportChat.errorBusy");
    } finally {
      setSending(false);
    }
  }

  async function sendToTeam() {
    if (writeSending) return;
    const email = account?.email || writeEmail.trim();
    if (!account?.email && !EMAIL_PATTERN.test(email)) {
      setWriteError("supportChat.errorEmail");
      return;
    }

    setWriteError(null);
    setWriteSending(true);

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          messages,
          email,
          note: writeNote.trim(),
          language,
          path: pathname,
          app: isNativeApp(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (response.ok) {
        setSentTo(email);
        setWriteNote("");
        setMode("sent");
      } else if (data.error === "email") {
        setWriteError("supportChat.errorEmail");
      } else if (response.status === 429) {
        setWriteError("supportChat.errorLimit");
      } else {
        setWriteError("supportChat.errorSend");
      }
    } catch {
      setWriteError("supportChat.errorSend");
    } finally {
      setWriteSending(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setError(null);
    setMode(enabled === false ? "write" : "chat");
  }

  const isBusiness = account?.role === "business";
  const suggestions: TranslationKey[] = isBusiness
    ? ["supportChat.askAddBox", "supportChat.askPayout", "supportChat.askPause"]
    : ["supportChat.askCancel", "supportChat.askCode", "supportChat.askRefund"];
  const hasUserMessage = messages.some((message) => message.role === "user");
  const canSendToTeam = hasUserMessage || writeNote.trim().length > 0;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("supportChat.open")}
          className="support-chat-launcher fixed right-4 bottom-[calc(5.75rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-brand-forest text-brand-mint shadow-[0_10px_28px_rgba(15,58,50,0.32)] transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 lg:right-6 lg:bottom-6"
        >
          <ChatIcon className="h-7 w-7" strokeWidth={1.9} />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={t("supportChat.title")}
          className="support-chat-panel fixed inset-0 z-[60] flex flex-col overflow-hidden bg-brand-ground text-brand-ink sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-brand-border sm:shadow-[0_24px_60px_rgba(11,43,38,0.35)] lg:right-6 lg:bottom-6"
        >
          <header className="flex items-center gap-3 bg-brand-forest px-4 pt-[calc(0.75rem+var(--safe-area-inset-top,env(safe-area-inset-top,0px)))] pb-3 text-brand-ground sm:pt-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-mint/15 text-brand-mint">
              <ChatIcon className="h-6 w-6" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold leading-tight">{t("supportChat.title")}</p>
              <p className="truncate text-[12px] leading-tight text-brand-mint/85">
                {enabled === false ? t("supportChat.writeToUs") : t("supportChat.subtitle")}
              </p>
            </div>
            {messages.length > 0 && mode === "chat" && (
              <button
                type="button"
                onClick={startNewChat}
                className="min-h-9 rounded-full px-3 text-[12px] font-semibold text-brand-mint transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint"
              >
                {t("supportChat.newChat")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
              aria-label={t("supportChat.close")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-ground transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint"
            >
              <XIcon className="h-5 w-5" strokeWidth={2} />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite">
            {mode === "chat" && (
              <>
                <Bubble role="assistant">{t("supportChat.greeting")}</Bubble>

                {!hasUserMessage && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {suggestions.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void sendMessage(t(key))}
                        disabled={sending}
                        className="rounded-full border border-brand-forest/20 bg-white px-3.5 py-2 text-left text-[14px] font-medium text-brand-forest transition hover:border-brand-forest/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest disabled:opacity-50"
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((message, index) => (
                  <Bubble key={index} role={message.role}>
                    {message.content}
                  </Bubble>
                ))}

                {sending && (
                  <div className="flex w-max items-center gap-1.5 rounded-2xl rounded-bl-md border border-brand-border bg-white px-4 py-3" aria-label={t("supportChat.thinking")}>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-secondary [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-secondary [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-secondary" />
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-[#f1c9bf] bg-[#fdf1ed] px-3.5 py-2.5 text-[14px] leading-snug text-[#8a2f1d]">
                    {t(error)}{" "}
                    <button
                      type="button"
                      onClick={() => setMode("write")}
                      className="font-semibold underline underline-offset-2"
                    >
                      {t("supportChat.writeToUs")}
                    </button>
                  </div>
                )}
              </>
            )}

            {mode === "write" && (
              <div className="space-y-3">
                {enabled === false && <Bubble role="assistant">{t("supportChat.off")}</Bubble>}
                <div className="rounded-2xl border border-brand-border bg-white p-4">
                  <p className="text-[16px] font-semibold text-brand-ink">{t("supportChat.writeTitle")}</p>
                  <p className="mt-1 text-[14px] leading-snug text-brand-secondary">{t("supportChat.writeText")}</p>

                  {account?.email ? (
                    <p className="mt-3 text-[14px] text-brand-ink">
                      {t("supportChat.writeReplyTo").replace("{email}", account.email)}
                    </p>
                  ) : (
                    <label className="mt-3 block">
                      <span className="text-[13px] font-medium text-brand-secondary">{t("supportChat.writeEmail")}</span>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={writeEmail}
                        onChange={(event) => setWriteEmail(event.target.value)}
                        className="mt-1 block w-full rounded-xl border border-brand-border bg-brand-ground px-3 py-2.5 text-[16px] text-brand-ink focus:border-brand-forest focus:outline-none"
                      />
                    </label>
                  )}

                  <label className="mt-3 block">
                    <span className="text-[13px] font-medium text-brand-secondary">{t("supportChat.writeNote")}</span>
                    <textarea
                      value={writeNote}
                      onChange={(event) => setWriteNote(event.target.value.slice(0, 2000))}
                      rows={3}
                      className="mt-1 block w-full resize-none rounded-xl border border-brand-border bg-brand-ground px-3 py-2.5 text-[16px] text-brand-ink focus:border-brand-forest focus:outline-none"
                    />
                  </label>

                  {writeError && (
                    <p className="mt-2 text-[14px] leading-snug text-[#8a2f1d]">{t(writeError)}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => void sendToTeam()}
                    disabled={writeSending || !canSendToTeam}
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-forest px-5 text-[15px] font-semibold text-brand-ground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    {writeSending ? t("supportChat.writeSending") : t("supportChat.writeSend")}
                  </button>
                </div>

                {enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setMode("chat")}
                    className="mx-auto block min-h-10 px-3 text-[14px] font-semibold text-brand-forest underline underline-offset-2"
                  >
                    {t("supportChat.writeBack")}
                  </button>
                )}
              </div>
            )}

            {mode === "sent" && (
              <div className="space-y-3">
                <Bubble role="assistant">{t("supportChat.writeSent").replace("{email}", sentTo)}</Bubble>
                {enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setMode("chat")}
                    className="mx-auto block min-h-10 px-3 text-[14px] font-semibold text-brand-forest underline underline-offset-2"
                  >
                    {t("supportChat.writeBack")}
                  </button>
                )}
              </div>
            )}
          </div>

          {mode === "chat" && (
            <div className="border-t border-brand-border bg-white/70 px-3 pt-2 pb-[calc(0.625rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:pb-2.5">
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    const box = event.target;
                    box.style.height = "auto";
                    box.style.height = `${Math.min(box.scrollHeight, 128)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  rows={1}
                  maxLength={MAX_LENGTH + 200}
                  enterKeyHint="send"
                  placeholder={t("supportChat.placeholder")}
                  aria-label={t("supportChat.placeholder")}
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-brand-border bg-white px-3.5 py-2.5 text-[16px] leading-snug text-brand-ink placeholder:text-brand-secondary/80 focus:border-brand-forest focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label={t("supportChat.send")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-forest text-brand-mint transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest focus-visible:ring-offset-2 disabled:opacity-40"
                >
                  <ArrowUpIcon className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[11px] leading-snug text-brand-secondary">{t("supportChat.disclaimer")}</p>
                <button
                  type="button"
                  onClick={() => setMode("write")}
                  className="shrink-0 rounded-full border border-brand-forest/25 px-3 py-1.5 text-[13px] font-semibold text-brand-forest transition hover:border-brand-forest/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
                >
                  {t("supportChat.writeToUs")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: ChatMessage["role"]; children: React.ReactNode }) {
  return role === "user" ? (
    <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-forest px-3.5 py-2.5 text-[15px] leading-relaxed text-brand-ground">
      {children}
    </div>
  ) : (
    <div className="w-fit max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-brand-border bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-brand-ink">
      {children}
    </div>
  );
}
