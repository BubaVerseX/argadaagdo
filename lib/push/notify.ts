import { logger } from "@/lib/logger";
import { formatPickupWindow, getTbilisiDateKey } from "@/lib/offerLifecycle";
import { isPushConfigured, sendPush, type PushDevice } from "@/lib/push/send";

// Customer push notifications. Called next to the matching emails
// (lib/email/events.ts) and from the daily publishing cron. Never throws:
// a failed push must not fail a payment callback or a cron run.

type Language = "ka" | "en";
type Device = PushDevice & { language: Language };

// Service-role client; typed loosely like lib/email/events.ts.
type ServiceClient = {
  from: (table: string) => {
    select: (columns: string) => {
      in: (column: string, values: unknown[]) => PromiseLike<{ data: unknown; error: unknown }>;
    };
    delete: () => {
      in: (column: string, values: unknown[]) => PromiseLike<{ error: unknown }>;
    };
  };
};

type OrderLike = {
  id: number;
  user_id: string;
  offers: {
    title: string | null;
    pickup_date: string | null;
    pickup_start: string | null;
    pickup_end: string | null;
    businesses: { name: string | null } | null;
  } | null;
};

type Copy = { title: string; body: string };

// kind: "orders" = order updates, "new_boxes" = new boxes from saved places
// (marketing, only where the account turned it on: 20261107140000).
async function devicesFor(client: ServiceClient, userIds: string[], kind: "orders" | "new_boxes") {
  if (userIds.length === 0) return [];
  const { data, error } = await client
    .from("push_devices")
    .select("token, platform, language, user_id, notify_orders, notify_new_boxes")
    .in("user_id", userIds);
  // The table may not exist yet (migration not applied): treat as no devices.
  if (error || !Array.isArray(data)) return [];
  return (data as (Device & { user_id: string; notify_orders?: boolean; notify_new_boxes?: boolean })[]).filter(
    (device) => (kind === "orders" ? device.notify_orders !== false : device.notify_new_boxes === true)
  );
}

async function deliver(
  client: ServiceClient,
  devices: Device[],
  copy: (language: Language) => Copy,
  url: string,
  collapseKey: string
) {
  let sent = 0;
  const gone: string[] = [];

  for (const language of ["ka", "en"] as const) {
    const group = devices.filter((device) => device.language === language);
    if (group.length === 0) continue;
    const result = await sendPush(group, { ...copy(language), url, collapseKey });
    sent += result.sent;
    gone.push(...result.goneTokens);
  }

  if (gone.length > 0) {
    await client.from("push_devices").delete().in("token", gone);
  }

  return sent;
}

function orderParts(order: OrderLike, language: Language) {
  const offer = order.offers;
  return {
    place: offer?.businesses?.name || "ArGadaagdo",
    window: offer ? formatPickupWindow(offer, language) : "",
  };
}

export type OrderPushKind = "confirmed" | "cancelled" | "reminder";

const ORDER_COPY: Record<OrderPushKind, (parts: { place: string; window: string }, language: Language) => Copy> = {
  confirmed: ({ place, window }, language) =>
    language === "ka"
      ? { title: "შეკვეთა დადასტურდა ✓", body: `${place} · წაღება: ${window}.` }
      : { title: "Order confirmed ✓", body: `${place} · pickup ${window}. Your code is in Orders.` },
  cancelled: ({ place }, language) =>
    language === "ka"
      ? { title: "შეკვეთა გაუქმდა", body: `${place} · თანხა იმავე ბარათზე დაგიბრუნდება.` }
      : { title: "Order cancelled", body: `${place} · the money goes back to the same card.` },
  reminder: ({ place, window }, language) =>
    language === "ka"
      ? { title: "დღეს წასაღებია 🥐", body: `${place} · ${window}. არ დაგავიწყდეს!` }
      : { title: "Pickup today 🥐", body: `${place} · ${window}. See you there!` },
};

export async function sendOrderPush(client: unknown, order: OrderLike | null, kind: OrderPushKind) {
  if (!order || !isPushConfigured()) return { sent: 0 };
  try {
    const service = client as ServiceClient;
    const devices = await devicesFor(service, [order.user_id], "orders");
    const dateKey = order.offers?.pickup_date || getTbilisiDateKey();
    const sent = await deliver(
      service,
      devices,
      (language) => ORDER_COPY[kind](orderParts(order, language), language),
      "/orders",
      kind === "reminder" ? `reminder-${order.id}-${dateKey}` : `order-${order.id}`
    );
    return { sent };
  } catch (error) {
    logger.warn("Order push failed", { kind, error: error instanceof Error ? error.message : error });
    return { sent: 0 };
  }
}

/** "New box at a favourite place": users who saved any offer of these businesses. */
export async function sendFavouriteBoxesPush(
  client: unknown,
  businesses: { id: number; name: string | null; offerId: number }[]
) {
  if (businesses.length === 0 || !isPushConfigured()) return { sent: 0 };
  try {
    const service = client as ServiceClient;
    const businessIds = businesses.map((business) => business.id);
    const { data } = await service
      .from("favorites")
      .select("user_id, offers!inner(business_id)")
      .in("offers.business_id", businessIds);
    const rows = (Array.isArray(data) ? data : []) as {
      user_id: string;
      offers: { business_id: number } | null;
    }[];

    // One notification per person: the first matching place.
    const firstPlace = new Map<string, number>();
    for (const row of rows) {
      const businessId = Number(row.offers?.business_id);
      if (!firstPlace.has(row.user_id) && businessIds.includes(businessId)) {
        firstPlace.set(row.user_id, businessId);
      }
    }

    const devices = await devicesFor(service, [...firstPlace.keys()], "new_boxes");
    const today = getTbilisiDateKey();
    let sent = 0;

    for (const [userId, businessId] of firstPlace) {
      const business = businesses.find((item) => item.id === businessId)!;
      const name = business.name || "ArGadaagdo";
      sent += await deliver(
        service,
        devices.filter((device) => device.user_id === userId),
        (language) =>
          language === "ka"
            ? { title: "ახალი ლანჩ ბოქსი 💚", body: `${name} — შენს რჩეულებში. დაჯავშნე, სანამ გაიყიდება.` }
            : { title: "New Lunch Box 💚", body: `${name}, one of your favourites. Reserve before it's gone.` },
        `/offers/${business.offerId}`,
        `favourites-${businessId}-${today}`
      );
    }

    return { sent };
  } catch (error) {
    logger.warn("Favourite push failed", { error: error instanceof Error ? error.message : error });
    return { sent: 0 };
  }
}
