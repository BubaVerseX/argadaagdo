"use client";

import {
  ChevronRightIcon,
  HeartIcon,
  HelpCircleIcon,
  type IconProps,
  LayoutGridIcon,
  ReceiptIcon,
  SettingsIcon,
  ShareIcon,
  ShieldIcon,
  TagIcon,
  UserPlusIcon,
  XIcon,
} from "@/components/icons";
import { getProfileById } from "@/lib/auth";
import {
  getAppVersionLabel,
  openSocial,
  socialLinks,
  supportEmail,
} from "@/lib/appLinks";
import { OPERATOR_LOCATION, OPERATOR_SHORT } from "@/lib/legal/shared";
import { calculateImpact, formatKg } from "@/lib/impact";
import { getImpactProgress } from "@/lib/impactLevels";
import { shareImage, shareLink } from "@/lib/share";
import { isNativeApp } from "@/lib/native";
import { readPrivateMemory, writePrivateMemory } from "@/lib/nativeData";
import { isCollectedOrderStatus } from "@/lib/orderStatus";
import { loadMyIdentity, type MyIdentity } from "@/lib/profileIdentity";
import { supabase } from "@/lib/supabase";
import ProfileAvatar, { useCanPickAvatar } from "@/components/profile/ProfileAvatar";
import type { OrderStatus } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState, type ComponentType } from "react";
import Link from "./AppLink";
import ImpactPlant from "./ImpactPlant";
import NativeHero from "./NativeHero";

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

  const collected = (
    (ordersResult.data || []) as unknown as {
      status: OrderStatus;
      amount: number | string | null;
      offers: { old_price: number | string | null } | null;
    }[]
  ).filter((order) => isCollectedOrderStatus(order.status));

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

const INVITE_URL = "https://argadaagdo.ge";

// Calm and personal: who you are, what you saved (with a plant that grows
// with every box and a level), share and invite, five rows, a small footer.
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
  const [sharing, setSharing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [identity, setIdentity] = useState<MyIdentity | null>(null);
  const canPickPhoto = useCanPickAvatar();

  useEffect(() => {
    let active = true;

    void getAppVersionLabel().then((label) => active && setVersion(label));
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const current = data.session;
      setSession(current);
      setReady(true);
      if (!current) return;

      void loadMyIdentity(current.user.id).then(
        (loaded) =>
          active &&
          setIdentity(
            loaded || { displayName: "", displayNameChangedAt: null, avatarPath: null }
          )
      );

      if (!readPrivateMemory(MEMORY_KEY, current.user.id)) setSummary(null);
      const next = await loadSummary(current.user.id);
      writePrivateMemory(MEMORY_KEY, current.user.id, next);
      if (active) setSummary(next);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const metadata = session?.user.user_metadata || {};
  // The name from public.profiles; the old metadata name only as a fallback.
  const name =
    identity?.displayName ||
    (metadata.display_name as string | undefined) ||
    (metadata.full_name as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    "";
  const firstName = name.split(/\s+/)[0] || name;
  const boxes = summary?.bags || 0;
  const impact = calculateImpact(boxes);
  const level = getImpactProgress(boxes);

  async function shareImpact() {
    if (!summary || sharing) return;
    setSharing(true);
    try {
      const { drawImpactCard } = await import("@/lib/impactCard");
      const blob = await drawImpactCard({
        boxes,
        moneySaved: summary.moneySaved,
        co2Kg: impact.co2Kg,
        level: level.current,
        language,
      });
      const result = await shareImage(blob, {
        fileName: "argadaagdo-impact.png",
        title: L("ჩემი გავლენა", "My impact"),
      });
      if (result === "unsupported") setPreview(URL.createObjectURL(blob));
    } catch {
      setToast(L("სურათი ვერ შეიქმნა", "Couldn't create the image"));
    } finally {
      setSharing(false);
    }
  }

  async function invite() {
    const result = await shareLink({
      title: "ArGadaagdo",
      text: L(
        "ფასდაკლებული ლანჩ ბოქსები თბილისის კაფეებიდან და საცხობებიდან. სცადე „არ გადააგდო“:",
        "Discounted Lunch Boxes from Tbilisi cafés and bakeries. Try ArGadaagdo:"
      ),
      url: INVITE_URL,
    });
    if (result === "copied") setToast(L("ბმული დაკოპირდა", "Link copied"));
  }

  const rows: Row[] = session
    ? [
        {
          href: "/orders",
          label: L("ჩემი შეკვეთები", "My orders"),
          Icon: ReceiptIcon,
        },
        {
          href: "/favorites",
          label: L("რჩეულები", "Favourites"),
          Icon: HeartIcon,
        },
        { href: "/payment", label: L("გადახდა", "Payment"), Icon: TagIcon },
        {
          href: "/support",
          label: L("დახმარება", "Help"),
          Icon: HelpCircleIcon,
        },
        {
          href: "/settings",
          label: L("პარამეტრები", "Settings"),
          Icon: SettingsIcon,
        },
        ...(summary?.role === "business"
          ? [
              {
                href: "/business/dashboard",
                label: L("ბიზნეს პანელი", "Business panel"),
                Icon: LayoutGridIcon,
              },
            ]
          : []),
        ...(summary?.role === "admin"
          ? [{ href: "/admin", label: L("ადმინი", "Admin"), Icon: ShieldIcon }]
          : []),
      ]
    : [
        { href: "/payment", label: L("გადახდა", "Payment"), Icon: TagIcon },
        {
          href: "/support",
          label: L("დახმარება", "Help"),
          Icon: HelpCircleIcon,
        },
      ];

  const footerLinks = [
    { href: "/terms", label: L("წესები", "Terms") },
    { href: "/privacy", label: L("კონფიდენციალურობა", "Privacy") },
    { href: "/about", label: L("ჩვენ შესახებ", "About") },
    { href: "/for-businesses", label: L("ბიზნესისთვის", "For businesses") },
  ];

  const impactCard = (
    <section
      aria-label={L("ჩემი გავლენა", "My impact")}
      className="rounded-[22px] bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold text-body">
            {L("ჩემი გავლენა", "My impact")}
          </h2>
          <dl className="mt-2 grid grid-cols-3 gap-2">
            {[
              {
                value: summary ? String(boxes) : "",
                label: L("ბოქსი", "boxes"),
              },
              {
                value: summary ? `${summary.moneySaved} ₾` : "",
                label: L("დაზოგილი", "saved"),
              },
              {
                value: summary ? formatKg(impact.co2Kg, language) : "",
                label: "CO₂",
              },
            ].map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dd className="truncate text-lg font-semibold leading-tight text-cream">
                  {stat.value || (
                    <span className="native-skeleton inline-block h-5 w-10 rounded" />
                  )}
                </dd>
                <dt className="truncate text-[11px] text-body">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
        {summary && <ImpactPlant boxes={boxes} size={52} />}
      </div>

    </section>
  );

  return (
    <main className="native-main">
      <NativeHero className="px-5 pb-1 pt-5">
        <header>
          {!ready ? (
            <div className="flex items-center gap-3">
              <div className="native-skeleton h-12 w-12 rounded-full" />
              <div className="native-skeleton h-5 w-36 rounded-lg" />
            </div>
          ) : session ? (
            <div className="flex items-center gap-3">
              <ProfileAvatar
                userId={session.user.id}
                name={name}
                avatarPath={identity?.avatarPath}
                isGeorgian={isGeorgian}
                size={56}
                onChange={(avatarPath) =>
                  setIdentity((current) => (current ? { ...current, avatarPath } : current))
                }
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold leading-tight text-cream">
                  {firstName}
                </p>
                {canPickPhoto === false && (
                  <p className="mt-0.5 text-[12px] text-body">
                    {L("განაახლე აპი ფოტოსთვის", "Update the app to add a photo")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] bg-card p-4">
              <p className="text-lg font-semibold text-cream">
                {L("გამარჯობა!", "Hello!")}
              </p>
              <p className="mt-0.5 text-sm text-body">
                {L("შედი და ნახე შენი გავლენა.", "Sign in to see your impact.")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/login?tab=signup"
                  className="native-press flex min-h-11 items-center justify-center rounded-2xl bg-brand-mint text-sm font-semibold text-brand-forest"
                >
                  {L("რეგისტრაცია", "Sign up")}
                </Link>
                <Link
                  href="/login?tab=signin"
                  className="native-press flex min-h-11 items-center justify-center rounded-2xl border border-line bg-card text-sm font-semibold text-cream"
                >
                  {L("შესვლა", "Sign in")}
                </Link>
              </div>
            </div>
          )}
        </header>
        {/* Business and admin accounts don't collect boxes: no customer impact block. */}
        {session && (!summary || summary.role === "customer" || !summary.role) && <div className="mt-4">{impactCard}</div>}
      </NativeHero>

      <div className="relative z-[1] grid gap-3 px-5">
        {session && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void shareImpact()}
                disabled={!summary || sharing}
                className="native-press flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-brand-forest px-2 text-[13px] font-semibold text-brand-ground disabled:opacity-60"
              >
                <ShareIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">
                  {L("გააზიარე", "Share my impact")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void invite()}
                className="native-press flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-line bg-card px-2 text-[13px] font-semibold text-cream"
              >
                <UserPlusIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">
                  {L("მოიწვიე მეგობარი", "Invite a friend")}
                </span>
              </button>
            </div>
          </>
        )}

        <nav className="overflow-hidden rounded-[22px] bg-card">
          {rows.map(({ href, label, Icon }, index) => (
            <Link
              key={href}
              href={href}
              className={`native-press flex min-h-[3.25rem] items-center gap-3 px-4 text-[15px] text-cream ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0 text-sage"
                strokeWidth={1.8}
              />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronRightIcon
                className="h-4 w-4 shrink-0 text-muted"
                strokeWidth={2}
              />
            </Link>
          ))}
        </nav>

        <footer className="px-1 pb-2 pt-2 text-center text-[11px] leading-5 text-body">
          <p className="flex flex-wrap justify-center gap-x-3">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="underline-offset-2 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </p>
          <p className="mt-1 flex flex-wrap justify-center gap-x-3">
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            {socialLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => openSocial(link)}
              >
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

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={L("ჩემი გავლენა", "My impact")}
          className="fixed inset-0 z-[70] flex items-end bg-black/35"
          onClick={() => setPreview(null)}
        >
          <div
            className="native-sheet w-full rounded-t-[28px] bg-[#fbf7ee] px-5 pb-[calc(1.25rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-cream">
                {L("ჩემი გავლენა", "My impact")}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label={L("დახურვა", "Close")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-cream"
              >
                <XIcon className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local blob, not an optimisable image */}
            <img
              src={preview}
              alt={L("ჩემი გავლენის ბარათი", "My impact card")}
              className="mx-auto mt-3 max-h-[58vh] w-auto rounded-2xl border border-line"
            />
            <p className="mt-3 text-center text-xs text-body">
              {L(
                "ხანგრძლივად დააჭირე სურათს, რომ შეინახო და გააზიარო.",
                "Press and hold the image to save it, then add it to your story."
              )}
            </p>
            {/* The app shell can't open a blob download; there, press and hold. */}
            {!isNativeApp() && (
              <a
                href={preview}
                download="argadaagdo-impact.png"
                className="native-press mt-3 flex min-h-11 items-center justify-center rounded-2xl bg-brand-forest text-sm font-semibold text-brand-ground"
              >
                {L("სურათის შენახვა", "Save image")}
              </a>
            )}
          </div>
        </div>
      )}

      {toast && (
        <p
          role="status"
          className="native-fixed-bottom fixed inset-x-0 z-[60] mx-auto mb-20 w-max max-w-[90vw] rounded-full bg-brand-forest px-4 py-2 text-[13px] font-medium text-brand-ground"
        >
          {toast}
        </p>
      )}
    </main>
  );
}
