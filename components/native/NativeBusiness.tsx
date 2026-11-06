"use client";

import { LeafDecor, WaveEdge } from "@/components/design/Decor";
import { PickupVerificationModal } from "@/components/business/PickupVerificationModal";
import {
  ChevronRightIcon,
  LayoutGridIcon,
  PlusIcon,
  ReceiptIcon,
  TagIcon,
} from "@/components/icons";
import Notice from "@/components/Notice";
import { getProfileById, isEmailConfirmed } from "@/lib/auth";
import { triggerTransactionalEmail } from "@/lib/email/client";
import { logAppError } from "@/lib/errors";
import { translateUserMessage } from "@/lib/messageTranslations";
import { notifyPickupCompleted } from "@/lib/notifications";
import {
  getBagSizeBadge,
  getOfferCategoryLabel,
  getOfferCategoryTone,
} from "@/lib/offerCategories";
import {
  formatMoney,
  formatPickupWindow,
  getTbilisiDateKey,
} from "@/lib/offerLifecycle";
import { ORDER_COLUMNS } from "@/lib/orderColumns";
import {
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import { getLoginRedirectUrl } from "@/lib/orders";
import { supabase, uniqueChannelName } from "@/lib/supabase";
import type { Business, Offer, Order } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "./AppLink";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const FULL_PANEL = "/business/dashboard?full=1";

// The day-to-day of a store on one screen: what sold, what to hand over, publish.
// Everything else (templates, departments, reports, profile, reviews, no-shows)
// is in the full panel one tap away. Nothing here is cached.
export default function NativeBusiness() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const [verifying, setVerifying] = useState<Order | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (businessIds: number[]) => {
    const today = getTbilisiDateKey();
    const { data: todayOffers, error: offerError } = await supabase
      .from("offers")
      .select("*")
      .in("business_id", businessIds)
      .eq("pickup_date", today)
      .order("id", { ascending: false });

    if (offerError) {
      setMessageTone("error");
      setMessage("Your offers could not be loaded.");
      setLoading(false);
      return [];
    }

    const list = (todayOffers || []) as Offer[];
    setOffers(list);

    if (list.length > 0) {
      const { data: todayOrders, error: orderError } = await supabase
        .from("orders")
        .select(
          `${ORDER_COLUMNS}, offers(id, title, price, pickup_date, pickup_start, pickup_end, category, size)`
        )
        .in(
          "offer_id",
          list.map((offer) => offer.id)
        )
        .order("id", { ascending: false });

      if (orderError) {
        logAppError("Native business orders failed to load", orderError, {
          operation: "native_load_business_orders",
        });
      }

      setOrders((todayOrders || []) as unknown as Order[]);
    } else {
      setOrders([]);
    }

    setLoading(false);
    return list.map((offer) => offer.id);
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session || !isEmailConfirmed(session.user)) {
        router.replace(getLoginRedirectUrl("/business/dashboard"));
        return;
      }

      // In parallel; the full dashboard asks one after the other.
      const [profile, businessResult] = await Promise.all([
        getProfileById(session.user.id, 3),
        supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", session.user.id)
          .order("id", { ascending: false }),
      ]);

      if (!active) return;

      if (profile && profile.role !== "business") {
        router.replace("/");
        return;
      }

      const all = (businessResult.data || []) as Business[];
      const approved = all.filter(
        (item) => item.approved === true || String(item.approved) === "true"
      );

      // Registration, review and rejection flows live in the full panel.
      if (businessResult.error || approved.length === 0) {
        router.replace(FULL_PANEL);
        return;
      }

      setBusiness(approved[0]);
      const ids = approved.map((item) => item.id);
      const offerIds = await load(ids);

      if (!active) return;

      const reload = () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(() => void load(ids), 250);
      };

      channel = supabase
        .channel(uniqueChannelName(`native-business-${ids.join("-")}`))
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "offers",
            filter: `business_id=in.(${ids.join(",")})`,
          },
          reload
        );

      if (offerIds.length > 0) {
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `offer_id=in.(${offerIds.join(",")})`,
          },
          reload
        );
      }

      channel.subscribe();
    })();

    return () => {
      active = false;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load, router]);

  const paidOrders = orders.filter(
    (order) =>
      isConfirmedOrderStatus(order.status) || isCollectedOrderStatus(order.status)
  );
  const pickups = orders.filter((order) => isConfirmedOrderStatus(order.status));
  const salesTotal = paidOrders.reduce(
    (sum, order) => sum + Number(order.amount ?? order.offers?.price ?? 0),
    0
  );

  async function submitCode() {
    if (!verifying || updatingOrderId !== null) return;

    const entered = code.trim();

    if (!entered) {
      setCodeError("Pickup code is required.");
      return;
    }

    setCodeError("");
    setUpdatingOrderId(verifying.id);

    // The same check as the full dashboard: complete_pickup decides on the
    // server, and this screen never sees the real code.
    const { data: result, error } = await supabase.rpc("complete_pickup", {
      p_order_id: verifying.id,
      p_pickup_code: entered,
    });

    if (error) {
      logAppError("Pickup completion failed", error, {
        operation: "complete_pickup",
        orderId: verifying.id,
      });
      setUpdatingOrderId(null);
      setCodeError(
        error.message?.includes("Invalid pickup code")
          ? "Pickup code does not match."
          : "Pickup could not be completed. Check the code, or close this window to see the details."
      );
      return;
    }

    if (result === "invalid_code" || result === "locked") {
      setUpdatingOrderId(null);
      setCodeError(
        result === "locked"
          ? "This order is locked after 5 wrong pickup codes. Contact ArGadaagdo support to unlock it."
          : "Pickup code does not match."
      );
      return;
    }

    const { data: updated } = await supabase
      .from("orders")
      .select("status")
      .eq("id", verifying.id)
      .maybeSingle();
    const status = (updated as { status?: string } | null)?.status;

    if (status && !["completed", "collected"].includes(status)) {
      setUpdatingOrderId(null);
      setCodeError(
        "The pickup window had already ended, so this order could not be completed."
      );
      return;
    }

    notifyPickupCompleted({
      orderId: verifying.id,
      offerTitle: verifying.offers?.title,
    });
    void triggerTransactionalEmail({
      event: "pickup_completed",
      orderId: verifying.id,
    });
    setMessageTone("success");
    setMessage("Pickup completed successfully.");
    setOrders((current) =>
      current.map((order) =>
        order.id === verifying.id ? { ...order, status: "collected" } : order
      )
    );
    setUpdatingOrderId(null);
    setVerifying(null);
    setCode("");
  }

  return (
    <main className="native-main">
      <header className="theme-forest relative overflow-hidden bg-brand-forest px-4 pb-3 pt-4">
        <LeafDecor className="-right-10 -top-12 h-52 w-52 text-brand-forest-2" />
        <p className="relative text-[13px] text-brand-mint">
          {t("native.business.panel")}
        </p>
        {business ? (
          <h1 className="relative truncate font-serif text-xl font-bold text-brand-ground">
            {business.name}
          </h1>
        ) : (
          <div className="relative mt-1 h-7 w-2/3 animate-pulse rounded-lg bg-brand-forest-2" />
        )}

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[18px] bg-brand-forest-2 p-3">
            <p className="truncate text-[11px] text-brand-mint">
              {t("native.business.soldToday")}
            </p>
            <p className="text-2xl font-bold text-brand-ground">
              {loading ? "–" : paidOrders.length}
            </p>
          </div>
          <div className="rounded-[18px] bg-brand-forest-2 p-3">
            <p className="truncate text-[11px] text-brand-mint">
              {t("native.business.sales")}
            </p>
            <p className="truncate text-2xl font-bold text-brand-ground">
              {loading ? "–" : `${Math.round(salesTotal)} ₾`}
            </p>
          </div>
          <div className="rounded-[18px] bg-brand-honey p-3 text-brand-ink">
            <p className="truncate text-[11px]">{t("native.business.toHand")}</p>
            <p className="text-2xl font-bold">{loading ? "–" : pickups.length}</p>
          </div>
        </div>
      </header>
      <WaveEdge />

      <section className="grid gap-3 px-4">
        {message && (
          <Notice tone={messageTone}>
            {translateUserMessage(message, language)}
          </Notice>
        )}

        <Link
          href={`${FULL_PANEL}#create-offer`}
          className="native-press flex items-center gap-3.5 rounded-3xl bg-brand-mint p-4 text-brand-forest"
        >
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-forest text-brand-mint">
            <PlusIcon className="h-6 w-6" strokeWidth={2} />
          </span>
          <span className="text-base font-bold">{t("native.business.publish")}</span>
        </Link>

        <h2 className="mt-2 font-serif text-[1.0625rem] font-bold">
          {t("native.business.pickups")}
        </h2>
        {loading && <div className="native-skeleton h-[4.5rem] rounded-[20px]" />}
        {!loading && pickups.length === 0 && (
          <p className="rounded-[20px] bg-well p-4 text-center text-sm font-medium">
            {t("native.business.noPickups")}
          </p>
        )}
        {pickups.map((order) => (
          <div
            key={order.id}
            className="flex items-center gap-3 rounded-[20px] bg-card p-3 shadow-[var(--shadow-card)]"
          >
            <div className="min-w-0 flex-1 pl-1">
              <p className="truncate text-sm font-bold">
                #{order.id} · {order.offers?.title || t("common.food")}
              </p>
              {order.offers && (
                <p className="truncate text-[13px] text-body">
                  {formatPickupWindow(order.offers, language)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCode("");
                setCodeError("");
                setVerifying(order);
              }}
              className="native-press min-h-12 flex-none rounded-2xl bg-brand-forest px-4 text-sm font-bold text-brand-ground"
            >
              {t("native.business.enterCode")}
            </button>
          </div>
        ))}

        <h2 className="mt-2 font-serif text-[1.0625rem] font-bold">
          {t("native.business.today")}
        </h2>
        {loading && <div className="native-skeleton h-[4.5rem] rounded-[20px]" />}
        {!loading && offers.length === 0 && (
          <p className="rounded-[20px] bg-well p-4 text-center text-sm font-medium">
            {t("native.business.noBoxes")}
          </p>
        )}
        {offers.map((offer) => {
          const sold = paidOrders.filter((order) => order.offer_id === offer.id).length;
          const total = sold + Number(offer.quantity || 0);
          const size = getBagSizeBadge(offer.size);

          return (
            <div
              key={offer.id}
              className={`${getOfferCategoryTone(
                offer.category
              )} flex items-center gap-3 rounded-[20px] bg-cat p-3 text-cat-ink`}
            >
              <div className="min-w-0 flex-1 pl-1">
                <p className="truncate text-sm font-bold">
                  {getOfferCategoryLabel(offer.category, language)}
                  {size ? ` · ${language === "ka" ? "ზომა" : "Size"} ${size}` : ""}
                </p>
                <p className="truncate text-[13px] text-cat-ink-2">
                  {formatMoney(offer.price)} ·{" "}
                  {offer.unlimited_quantity ? sold : `${sold}/${total}`}{" "}
                  {t("native.business.sold")}
                </p>
              </div>
              {!offer.unlimited_quantity && total > 0 && (
                <div
                  aria-hidden="true"
                  className="h-2 w-14 flex-none overflow-hidden rounded-full bg-cat-soft"
                >
                  <div
                    className="h-full bg-brand-forest"
                    style={{ width: `${Math.round((sold / total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-2 overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-card)]">
          {(
            [
              [`${FULL_PANEL}#business-offers`, "native.business.manage", TagIcon],
              [`${FULL_PANEL}#business-reservations`, "native.business.reservations", ReceiptIcon],
              [FULL_PANEL, "native.business.full", LayoutGridIcon],
            ] as const
          ).map(([href, labelKey, Icon], index) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-14 items-center gap-3 px-4 font-bold ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 text-sage" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
            </Link>
          ))}
        </div>
      </section>

      {verifying && (
        <PickupVerificationModal
          t={t}
          language={language}
          order={verifying}
          code={code}
          error={codeError}
          updatingOrderId={updatingOrderId}
          onCodeChange={setCode}
          onClose={() => {
            if (updatingOrderId === null) setVerifying(null);
          }}
          onSubmit={() => void submitCode()}
        />
      )}
    </main>
  );
}
