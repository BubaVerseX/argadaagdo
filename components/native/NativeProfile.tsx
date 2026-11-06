"use client";

import {
  BellIcon,
  ChevronRightIcon,
  InfoIcon,
  type IconProps,
  LayoutGridIcon,
  ReceiptIcon,
  SettingsIcon,
  ShieldIcon,
  TagIcon,
} from "@/components/icons";
import { getProfileById } from "@/lib/auth";
import { getAppVersionLabel, openExternal, socialLinks, supportEmail } from "@/lib/appLinks";
import { OPERATOR_LOCATION, OPERATOR_SHORT } from "@/lib/legal/shared";
import { calculateImpact, formatKg } from "@/lib/impact";
import { readPrivateMemory, writePrivateMemory } from "@/lib/nativeData";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState, type ComponentType } from "react";
import Link from "./AppLink";

type ProfileSummary = {
  role: string;
  bags: number;
  moneySaved: number;
};

type Row = { href: string; label: string; Icon: ComponentType<IconProps> };

const MEMORY_KEY = "profile-summary";

async function loadSummary(userId: string): Promise<ProfileSummary> {
  const [profile, ordersResult] = await Promise.all([
    getProfileById(userId, 2),
    supabase
      .from("orders")
      .select("status, amount, offers(old_price)")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(500),
  ]);

  const collected = ((ordersResult.data || []) as unknown as {
    status: OrderStatus;
    amount: number | string | null;
    offers: { old_price: number | string | null } | null;
  }[]).filter((order) => isCollectedOrderStatus(order.status));

  // Saved = the shop's usual price minus what was paid, when the shop gave one.
  const moneySaved = collected.reduce((sum, order) => {
    const paid = Number(order.amount);
    const usual = Number(order.offers?.old_price);
    return Number.isFinite(paid) && Number.isFinite(usual) && usual > paid
      ? sum + (usual - paid)
      : sum;
  }, 0);

  return {
    role: profile?.role || "",
    bags: collected.length,
    moneySaved: Math.round(moneySaved),
  };
}

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "A";
}

// Short and clean: who you are and what you saved, five rows, and a small
// footer with the legal pages, support and the app version.
export default function NativeProfile() {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<ProfileSummary | null>(() =>
    readPrivateMemory<ProfileSummary>(MEMORY_KEY)
  );
  const [version, setVersion] = useState("");

  useEffect(() => {
    let active = true;

    void getAppVersionLabel().then((label) => active && setVersion(label));
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const current = data.session;
      setSession(current);
      setReady(true);
      if (!current) return;

      if (!readPrivateMemory(MEMORY_KEY, current.user.id)) setSummary(null);
      const next = await loadSummary(current.user.id);
      writePrivateMemory(MEMORY_KEY, current.user.id, next);
      if (active) setSummary(next);
    });

    return () => {
      active = false;
    };
  }, []);

  const metadata = session?.user.user_metadata || {};
  const name =
    (metadata.display_name as string | undefined) ||
    (metadata.full_name as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    "";
  const impact = calculateImpact(summary?.bags || 0);

  const rows: Row[] = session
    ? [
        { href: "/orders", label: L("ჩემი შეკვეთები", "My orders"), Icon: ReceiptIcon },
        { href: "/payment", label: L("გადახდა", "Payment"), Icon: TagIcon },
        { href: "/notifications", label: L("შეტყობინებები", "Notifications"), Icon: BellIcon },
        { href: "/support", label: L("დახმარება", "Help"), Icon: InfoIcon },
        { href: "/settings", label: L("პარამეტრები", "Settings"), Icon: SettingsIcon },
        ...(summary?.role === "business"
          ? [{ href: "/business/dashboard", label: L("ბიზნეს პანელი", "Business panel"), Icon: LayoutGridIcon }]
          : []),
        ...(summary?.role === "admin"
          ? [{ href: "/admin", label: L("ადმინი", "Admin"), Icon: ShieldIcon }]
          : []),
      ]
    : [
        { href: "/payment", label: L("გადახდა", "Payment"), Icon: TagIcon },
        { href: "/support", label: L("დახმარება", "Help"), Icon: InfoIcon },
      ];

  const footerLinks = [
    { href: "/terms", label: L("წესები", "Terms") },
    { href: "/privacy", label: L("კონფიდენციალურობა", "Privacy") },
    { href: "/faq", label: "FAQ" },
    { href: "/about", label: L("ჩვენ შესახებ", "About") },
    { href: "/contact", label: L("კონტაქტი", "Contact") },
    { href: "/for-businesses", label: L("ბიზნესისთვის", "For businesses") },
  ];

  return (
    <main className="native-main">
      <header className="px-5 pb-4 pt-5">
        {!ready ? (
          <div className="flex items-center gap-4">
            <div className="native-skeleton h-16 w-16 rounded-full" />
            <div className="native-skeleton h-6 w-40 rounded-lg" />
          </div>
        ) : session ? (
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mint font-serif text-2xl font-bold text-ink"
            >
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-serif text-2xl font-bold text-cream">{name}</p>
              <p className="truncate text-sm text-body">{session.user.email}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] bg-card p-5">
            <p className="font-serif text-2xl font-bold text-cream">
              {L("გამარჯობა!", "Hello!")}
            </p>
            <p className="mt-1 text-sm leading-6 text-body">
              {L(
                "შედი, რომ დაჯავშნო ლანჩ ბოქსები და ნახო, რამდენი დაზოგე.",
                "Sign in to reserve Lunch Boxes and see how much you've saved."
              )}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/login?tab=signup"
                className="native-press flex min-h-12 items-center justify-center rounded-2xl bg-mint text-[15px] font-bold text-ink"
              >
                {L("რეგისტრაცია", "Sign up")}
              </Link>
              <Link
                href="/login?tab=signin"
                className="native-press flex min-h-12 items-center justify-center rounded-2xl border border-line text-[15px] font-bold text-cream"
              >
                {L("შესვლა", "Sign in")}
              </Link>
            </div>
          </div>
        )}
      </header>

      <div className="grid gap-3 px-5">
        {session && (
          <section
            aria-label={L("შენი გავლენა", "Your impact")}
            className="grid grid-cols-3 gap-2 rounded-[24px] bg-card p-3"
          >
            {[
              { value: summary ? String(summary.bags) : "", label: L("ბოქსი", "boxes") },
              { value: summary ? `${summary.moneySaved} ₾` : "", label: L("დაზოგე", "saved") },
              {
                value: summary ? formatKg(impact.co2Kg, language) : "",
                label: L("CO₂ ნაკლები", "less CO₂"),
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-well px-2 py-3 text-center">
                {stat.value ? (
                  <p className="font-serif text-xl font-bold text-mint">{stat.value}</p>
                ) : (
                  <div className="native-skeleton mx-auto h-7 w-12 rounded-lg" />
                )}
                <p className="mt-0.5 text-xs font-medium text-body">{stat.label}</p>
              </div>
            ))}
          </section>
        )}

        <nav className="overflow-hidden rounded-[24px] bg-card">
          {rows.map(({ href, label, Icon }, index) => (
            <Link
              key={href}
              href={href}
              className={`native-press flex min-h-14 items-center gap-3 px-4 font-medium text-cream ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 text-sage" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            </Link>
          ))}
        </nav>

        <footer className="px-1 pb-2 pt-3 text-center text-xs leading-6 text-body">
          <p className="flex flex-wrap justify-center gap-x-3">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="underline-offset-2 hover:underline">
                {link.label}
              </Link>
            ))}
          </p>
          <p className="mt-1 flex flex-wrap justify-center gap-x-3">
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            {socialLinks.map((link) => (
              <button key={link.href} type="button" onClick={() => openExternal(link.href)}>
                {link.label}
              </button>
            ))}
          </p>
          <p className="mt-1 text-muted">
            © {OPERATOR_SHORT[language]} · {OPERATOR_LOCATION[language]}
            {version ? ` · ${L("ვერსია", "version")} ${version}` : ""}
          </p>
        </footer>
      </div>
    </main>
  );
}
