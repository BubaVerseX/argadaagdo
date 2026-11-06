"use client";

import { LeafDecor, WaveEdge } from "@/components/design/Decor";
import {
  BellIcon,
  ChevronRightIcon,
  HeartIcon,
  type IconProps,
  LayoutGridIcon,
  LogOutIcon,
  MailIcon,
  InfoIcon,
  SettingsIcon,
  ShieldIcon,
  StoreIcon,
  UserIcon,
} from "@/components/icons";
import { getProfileById, logoutUser } from "@/lib/auth";
import {
  languageShortNames,
  supportedLanguages,
  type TranslationKey,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";

type Row = {
  href: string;
  labelKey: TranslationKey;
  Icon: ComponentType<IconProps>;
};

function Rows({
  rows,
  t,
}: {
  rows: Row[];
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-card)]">
      {rows.map(({ href, labelKey, Icon }, index) => (
        <Link
          key={href}
          href={href}
          className={`flex min-h-14 items-center gap-3 px-4 font-medium ${
            index > 0 ? "border-t border-line" : ""
          }`}
        >
          <Icon className="h-5 w-5 shrink-0 text-sage" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
        </Link>
      ))}
    </div>
  );
}

// Everything the website header's menu held lives here, one tap from the bar.
export default function NativeProfile() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);

      if (data.session) {
        const profile = await getProfileById(data.session.user.id, 2);
        if (active) setRole(profile?.role || "");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await logoutUser();
    setSession(null);
    setRole("");
    router.replace("/");
    router.refresh();
  }

  const accountRows: Row[] = [
    { href: "/profile?full=1", labelKey: "native.profile.account", Icon: UserIcon },
    { href: "/favorites", labelKey: "nav.favorites", Icon: HeartIcon },
    { href: "/settings", labelKey: "nav.settings", Icon: SettingsIcon },
    ...(role === "business"
      ? [{ href: "/business/dashboard", labelKey: "nav.dashboard", Icon: LayoutGridIcon } as Row]
      : []),
    ...(role === "admin"
      ? [{ href: "/admin", labelKey: "nav.admin", Icon: ShieldIcon } as Row]
      : []),
  ];
  const moreRows: Row[] = [
    { href: "/businesses", labelKey: "nav.businesses", Icon: StoreIcon },
    { href: "/for-businesses", labelKey: "nav.forBusiness", Icon: LayoutGridIcon },
    { href: "/about", labelKey: "nav.about", Icon: InfoIcon },
  ];
  const helpRows: Row[] = [
    { href: "/faq", labelKey: "nav.faq", Icon: InfoIcon },
    { href: "/support", labelKey: "nav.support", Icon: InfoIcon },
    { href: "/contact", labelKey: "nav.contact", Icon: MailIcon },
    { href: "/privacy", labelKey: "nav.privacy", Icon: ShieldIcon },
    { href: "/terms", labelKey: "nav.terms", Icon: ShieldIcon },
  ];

  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined) ||
    session?.user.email ||
    "";

  return (
    <main className="native-main">
      <header className="theme-forest relative overflow-hidden bg-brand-forest px-4 pb-3 pt-4">
        <LeafDecor className="-right-10 -top-12 h-52 w-52 text-brand-forest-2" />
        <h1 className="relative font-serif text-[1.625rem] font-bold text-brand-ground">
          {t("nav.profile")}
        </h1>
        {!ready && (
          <div className="relative mt-3 h-6 w-2/3 animate-pulse rounded-lg bg-brand-forest-2" />
        )}
        {ready && session && (
          <p className="relative mt-1 truncate text-[15px] text-brand-mint">
            {displayName}
          </p>
        )}
        {ready && !session && (
          <>
            <p className="relative mt-1 text-[15px] text-brand-mint">
              {t("native.profile.guest")}
            </p>
            <Link
              href="/login"
              className="native-press relative mt-3 flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-brand-mint font-bold text-brand-forest"
            >
              {t("nav.signIn")}
            </Link>
          </>
        )}
      </header>
      <WaveEdge />

      <section className="grid gap-3 px-4">
        <div className="flex min-h-14 items-center justify-between gap-3 rounded-[22px] bg-card px-4 shadow-[var(--shadow-card)]">
          <span className="font-medium">{t("native.profile.language")}</span>
          <div className="flex rounded-full bg-well p-1">
            {supportedLanguages.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={language === option}
                onClick={() => setLanguage(option)}
                className={`min-h-9 rounded-full px-3 text-[13px] font-bold ${
                  language === option
                    ? "bg-brand-forest text-brand-ground"
                    : "text-cream"
                }`}
              >
                {languageShortNames[option]}
              </button>
            ))}
          </div>
        </div>

        {session && <Rows rows={accountRows} t={t} />}
        <Rows rows={moreRows} t={t} />

        <p className="flex min-h-14 items-center gap-3 rounded-[22px] bg-card px-4 font-medium shadow-[var(--shadow-card)]">
          <BellIcon className="h-5 w-5 shrink-0 text-sage" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate">{t("nav.noNotifications")}</span>
        </p>

        <Rows rows={helpRows} t={t} />

        {session && (
          <button
            type="button"
            onClick={() => void logout()}
            className="native-press flex min-h-14 items-center justify-center gap-2 rounded-[22px] bg-well font-bold"
          >
            <LogOutIcon className="h-4 w-4" strokeWidth={2} />
            {t("nav.logout")}
          </button>
        )}
      </section>
    </main>
  );
}
