"use client";

import {
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  type IconProps,
  XCircleIcon,
} from "@/components/icons";
import { getLoginRedirectUrl } from "@/lib/orders";
import { getCachedFeed, readPrivateMemory, writePrivateMemory } from "@/lib/nativeData";
import { formatPickupTimeRange, getTbilisiDateKeyFromValue } from "@/lib/offerLifecycle";
import {
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
  isStrictlyCancelledOrderStatus,
} from "@/lib/orderStatus";
import { supabase } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import Link from "./AppLink";
import NativeTopBar from "./NativeTopBar";
import PushToggle from "./PushToggle";

type Item = {
  id: string;
  at: string;
  href: string;
  Icon: ComponentType<IconProps>;
  title: string;
  body: string;
  fresh: boolean;
};

type OrderRow = {
  id: number;
  status: OrderStatus;
  amount: number | string | null;
  created_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
  offers: {
    title: string | null;
    pickup_date: string | null;
    pickup_start: string | null;
    pickup_end: string | null;
    businesses: { name: string | null } | null;
  } | null;
};

type Source = { orders: OrderRow[]; favoriteBusinessIds: number[] };

const MEMORY_KEY = "notifications";

// Georgian month names by hand: some phones' browsers lack Georgian dates.
const KA_MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];

function formatInboxDate(value: string, language: "ka" | "en") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tbilisi",
      day: "numeric",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  );
  const month = Number(parts.month) - 1;
  const name =
    language === "ka"
      ? KA_MONTHS[month]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month];
  return `${Number(parts.day)} ${name}, ${parts.hour}:${parts.minute}`;
}
const DAY = 24 * 60 * 60 * 1000;

// The inbox is built from what already happened to your orders and from new
// boxes at places you saved, so it is always true and needs no extra storage.
function buildItems(source: Source, language: "ka" | "en"): Item[] {
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const today = getTbilisiDateKeyFromValue(new Date().toISOString());
  const items: Item[] = [];

  for (const order of source.orders) {
    const title = order.offers?.title || L("ლანჩ ბოქსი", "Lunch Box");
    const place = order.offers?.businesses?.name || "";
    const window = order.offers
      ? formatPickupTimeRange(order.offers, language)
      : "";

    if (isConfirmedOrderStatus(order.status)) {
      const pickupToday = order.offers?.pickup_date === today;
      items.push({
        id: `order-${order.id}`,
        at: order.created_at,
        href: "/orders",
        Icon: pickupToday ? ClockIcon : CheckCircleIcon,
        title: pickupToday
          ? L("დღეს წასაღებია", "Pickup today")
          : L("შეკვეთა დადასტურდა", "Order confirmed"),
        body: [title, place, window].filter(Boolean).join(" · "),
        fresh: true,
      });
    } else if (isStrictlyCancelledOrderStatus(order.status)) {
      items.push({
        id: `order-${order.id}`,
        at: order.cancelled_at || order.created_at,
        href: "/orders",
        Icon: XCircleIcon,
        title:
          order.status === "refunded"
            ? L("თანხა დაბრუნდა", "Refunded")
            : L("შეკვეთა გაუქმდა", "Order cancelled"),
        body: [title, place].filter(Boolean).join(" · "),
        fresh: false,
      });
    } else if (isCollectedOrderStatus(order.status)) {
      items.push({
        id: `order-${order.id}`,
        at: order.completed_at || order.created_at,
        href: "/orders",
        Icon: CheckCircleIcon,
        title: L("წაღებულია ✓", "Picked up ✓"),
        body: [title, place].filter(Boolean).join(" · "),
        fresh: false,
      });
    }
  }

  const favorites = new Set(source.favoriteBusinessIds);
  for (const offer of getCachedFeed()?.offers || []) {
    if (!offer.business_id || !favorites.has(Number(offer.business_id))) continue;
    items.push({
      id: `offer-${offer.id}`,
      at: offer.created_at || new Date().toISOString(),
      href: `/offers/${offer.id}`,
      Icon: HeartIcon,
      title: L("ახალი ბოქსი რჩეულ ადგილას", "New box at a favourite place"),
      body: [offer.businesses?.name, offer.title].filter(Boolean).join(" · "),
      fresh: true,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
}

export default function NativeNotifications() {
  const router = useRouter();
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [source, setSource] = useState<Source | null>(() => readPrivateMemory<Source>(MEMORY_KEY));

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace(getLoginRedirectUrl("/notifications"));
        return;
      }

      const since = new Date(Date.now() - 30 * DAY).toISOString();
      const [ordersResult, favoritesResult] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, status, amount, created_at, cancelled_at, completed_at, offers(title, pickup_date, pickup_start, pickup_end, businesses(name))"
          )
          .eq("user_id", user.id)
          .neq("status", "pending_payment")
          .gte("created_at", since)
          .order("id", { ascending: false })
          .limit(30),
        supabase.from("favorites").select("offers(business_id)").eq("user_id", user.id).limit(200),
      ]);

      const next: Source = {
        orders: (ordersResult.data || []) as unknown as OrderRow[],
        favoriteBusinessIds: ((favoritesResult.data || []) as unknown as {
          offers: { business_id: number | null } | null;
        }[])
          .map((row) => Number(row.offers?.business_id))
          .filter((id) => Number.isFinite(id) && id > 0),
      };

      writePrivateMemory(MEMORY_KEY, user.id, next);
      if (active) setSource(next);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const items = source ? buildItems(source, language) : null;
  const formatDate = (value: string) => formatInboxDate(value, language);

  return (
    <main className="native-main native-main--bare">
      <NativeTopBar title={L("შეტყობინებები", "Notifications")} fallbackHref="/" />

      <div className="grid gap-3 px-5 pb-8">
        <PushToggle compact />

        {!items &&
          [0, 1, 2].map((key) => <div key={key} className="native-skeleton h-[4.5rem] rounded-[22px]" />)}

        {items && items.length === 0 && (
          <div className="rounded-[24px] bg-card px-5 py-8 text-center">
            <BellIcon className="mx-auto h-8 w-8 text-sage" strokeWidth={1.6} />
            <p className="mt-3 font-bold text-cream">{L("ჯერ არაფერია", "Nothing yet")}</p>
            <p className="mt-1 text-sm leading-6 text-body">
              {L(
                "აქ ნახავ შეკვეთის დადასტურებას, წაღების შეხსენებებს და ახალ ბოქსებს რჩეული ადგილებიდან.",
                "Order confirmations, pickup reminders and new boxes from your favourite places will show up here."
              )}
            </p>
          </div>
        )}

        {items && items.length > 0 && (
          <ul className="overflow-hidden rounded-[24px] bg-card">
            {items.map((item, index) => (
              <li key={item.id} className={index > 0 ? "border-t border-line" : ""}>
                <Link href={item.href} className="native-press flex gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      item.fresh ? "bg-mint text-ink" : "bg-well text-sage"
                    }`}
                  >
                    <item.Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-bold text-cream">{item.title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {formatDate(item.at)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm leading-5 text-body">
                      {item.body}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
