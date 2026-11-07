"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ChevronDownIcon, MailIcon, SearchIcon } from "@/components/icons";
import {
  faqContent,
  HELP_CATEGORIES,
  type FaqEntry,
  type HelpCategoryId,
} from "@/lib/legal/faq";
import { SUPPORT_EMAIL } from "@/lib/legal/shared";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useMemo, useState } from "react";

// /support and /faq: one calm Help centre. Search on top, four categories,
// every question collapsed (one open at a time), Contact support at the end.

const COPY = {
  help: {
    title: { ka: "დახმარება", en: "Help" },
    tabTitle: { ka: "დახმარება", en: "Help & Support" },
    intro: {
      ka: "პასუხები შეკვეთაზე, გადახდასა და ანგარიშზე.",
      en: "Answers about orders, payment and your account.",
    },
  },
  faq: {
    title: { ka: "ხშირი კითხვები", en: "FAQ" },
    tabTitle: { ka: "ხშირი კითხვები", en: "Frequently Asked Questions" },
    intro: {
      ka: "მოკლე პასუხები ყველაზე ხშირ კითხვებზე.",
      en: "Short answers to the most common questions.",
    },
  },
};

// Help-centre-only answers (the FAQ text itself lives in lib/legal/faq.ts).
const EXTRA_ITEMS: Record<"ka" | "en", FaqEntry[]> = {
  ka: [
    {
      id: "password",
      question: "დამავიწყდა პაროლი ან მინდა შევცვალო",
      answer:
        "შესვლის გვერდზე აირჩიე „დაგავიწყდა პაროლი?“ და ელფოსტაზე ბმულს მიიღებ. აპში პაროლს პარამეტრებშიც შეცვლი — ჯერ ახლანდელი პაროლი ჩაწერე.",
    },
  ],
  en: [
    {
      id: "password",
      question: "Forgot your password or want to change it?",
      answer:
        "On the sign-in page tap \"Forgot password?\" and we'll email you a link. In the app you can also change it in Settings — enter your current password first.",
    },
  ],
};
const EXTRA_CATEGORY: Partial<Record<HelpCategoryId, string[]>> = {
  account: ["password"],
};

function entriesFor(language: "ka" | "en") {
  return new Map(
    [
      ...faqContent[language].groups.flatMap((group) => group.items),
      ...EXTRA_ITEMS[language],
    ].map((item) => [item.id, item])
  );
}

export default function HelpCenter({ variant }: { variant: "help" | "faq" }) {
  const { language } = useLanguage();
  const ka = language === "ka";
  useDocumentTitle(COPY[variant].tabTitle[language], language);
  const byId = useMemo(() => entriesFor(language), [language]);
  // Search looks in both languages, whichever one is on screen.
  const otherById = useMemo(
    () => entriesFor(language === "ka" ? "en" : "ka"),
    [language]
  );
  const [category, setCategory] = useState<HelpCategoryId>("orders");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Links like /faq#pickup or /faq#cancel open the right category (and question).
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const inCategory = (id: HelpCategoryId, itemIds: string[]) =>
      itemIds.includes(hash) || (EXTRA_CATEGORY[id] || []).includes(hash);
    const match = HELP_CATEGORIES.find(
      (item) =>
        item.id === hash ||
        inCategory(item.id, item.itemIds) ||
        item.legacyGroups.includes(hash as never)
    );
    if (!match) return;
    // Reading the URL hash is only possible after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategory(match.id);
    if (inCategory(match.id, match.itemIds)) setOpenId(hash);
  }, []);

  const search = query.trim().toLocaleLowerCase();
  const matches = (item?: FaqEntry) =>
    Boolean(item) &&
    `${item!.question} ${item!.answer}`.toLocaleLowerCase().includes(search);
  const items: FaqEntry[] = search
    ? [...byId.values()].filter(
        (item) => matches(item) || matches(otherById.get(item.id))
      )
    : [
        ...(HELP_CATEGORIES.find((item) => item.id === category)?.itemIds || []),
        ...(EXTRA_CATEGORY[category] || []),
      ]
        .map((id) => byId.get(id))
        .filter((item): item is FaqEntry => Boolean(item));

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 pb-10 pt-5 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-2xl">
          {/* In the app this block is the green header with a wave (app/native.css). */}
          <div className="help-hero">
            <h1 className="text-2xl font-semibold text-cream sm:text-4xl">
              {COPY[variant].title[language]}
            </h1>
            <p className="mt-1 text-sm text-body">
              {COPY[variant].intro[language]}
            </p>

            <label className="mt-4 flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-card px-4 focus-within:border-mint">
              <SearchIcon
                className="h-4 w-4 shrink-0 text-muted"
                strokeWidth={2}
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={ka ? "მოძებნე კითხვა" : "Search questions"}
                aria-label={ka ? "მოძებნე კითხვა" : "Search questions"}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-muted"
              />
            </label>
          </div>
          <svg
            className="help-hero-wave"
            viewBox="0 0 390 50"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 0 H390 V18 C300 50 210 0 120 26 C70 40 30 38 0 28 Z" />
          </svg>

          {!search && (
            <div
              role="tablist"
              aria-label={ka ? "კატეგორიები" : "Categories"}
              className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
            >
              {HELP_CATEGORIES.map((item) => {
                const active = item.id === category;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setCategory(item.id);
                      setOpenId(null);
                    }}
                    className={`h-11 flex-none rounded-full border px-3.5 text-[13px] font-semibold ${
                      active
                        ? "border-transparent bg-brand-forest text-brand-ground"
                        : "border-line bg-card text-body"
                    }`}
                  >
                    {item.title[language]}
                  </button>
                );
              })}
            </div>
          )}

          {items.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-[22px] border border-line bg-card">
              {items.map((item, index) => {
                const open = openId === item.id;
                return (
                  <div
                    key={item.id}
                    id={item.id}
                    className={index > 0 ? "border-t border-line" : ""}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`${item.id}-answer`}
                      onClick={() => setOpenId(open ? null : item.id)}
                      className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mint"
                    >
                      <span className="min-w-0 flex-1">{item.question}</span>
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                        strokeWidth={2}
                      />
                    </button>
                    {open && (
                      <p
                        id={`${item.id}-answer`}
                        className="px-4 pb-4 text-sm leading-6 text-body"
                      >
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-[22px] border border-line bg-card p-5 text-center text-sm text-body">
              {ka
                ? "ვერაფერი მოიძებნა. მოგვწერე და დაგეხმარებით."
                : "Nothing found. Write to us and we'll help."}
            </p>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-body">
              {ka ? "ვერ იპოვე პასუხი?" : "Didn't find an answer?"}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-forest px-6 text-[15px] font-semibold text-brand-ground sm:w-auto"
            >
              <MailIcon className="h-4 w-4" strokeWidth={2} />
              {ka ? "დაუკავშირდი მხარდაჭერას" : "Contact support"}
            </a>
            <p className="mt-2 text-xs text-body">{SUPPORT_EMAIL}</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
