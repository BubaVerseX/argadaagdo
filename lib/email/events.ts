import {
  formatPickupWindow,
  getTbilisiDateKey,
} from "@/lib/offerLifecycle";
import { absoluteSiteUrl } from "@/lib/site";
import { sendTransactionalEmail } from "@/lib/email/send";

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns: string, options?: Record<string, unknown>) => unknown;
  };
};

type QueryBuilder<T = unknown> = {
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  in: (column: string, values: unknown[]) => QueryBuilder<T>;
  order: (
    column: string,
    options?: { ascending?: boolean }
  ) => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  maybeSingle: () => Promise<{ data: T | null; error: { message: string } | null }>;
  then: Promise<{ data: T | null; error: { message: string } | null }>["then"];
};

type EmailProfile = {
  id: string;
  email: string | null;
  role?: string | null;
};

export type EmailOrderContext = {
  id: number;
  user_id: string;
  status: string | null;
  pickup_code: string | null;
  offers: {
    id: number;
    title: string | null;
    pickup_date: string | null;
    pickup_start: string | null;
    pickup_end: string | null;
    businesses: {
      id: number;
      owner_id: string;
      name: string | null;
      address: string | null;
      business_type?: string | null;
      approved?: boolean | null;
    } | null;
  } | null;
};

type BusinessEmailContext = {
  id: number;
  owner_id: string;
  name: string | null;
  approved: boolean | null;
};

function fromTable<T>(
  supabase: SupabaseLikeClient,
  table: string,
  columns: string,
  options?: Record<string, unknown>
) {
  return supabase.from(table).select(columns, options) as QueryBuilder<T>;
}

async function getProfileById(
  supabase: SupabaseLikeClient,
  userId: string
) {
  const { data, error } = await fromTable<EmailProfile>(
    supabase,
    "profiles",
    "id, email, role"
  )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.email) return null;
  return data;
}

export async function getOrderEmailContext(
  supabase: SupabaseLikeClient,
  orderId: number
) {
  const { data, error } = await fromTable<EmailOrderContext>(
    supabase,
    "orders",
    `
      id,
      user_id,
      status,
      pickup_code,
      offers(
        id,
        title,
        pickup_date,
        pickup_start,
        pickup_end,
        businesses(id, owner_id, name, address, business_type, approved)
      )
    `
  )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function getBusinessEmailContext(
  supabase: SupabaseLikeClient,
  businessId: number
) {
  const { data, error } = await fromTable<BusinessEmailContext>(
    supabase,
    "businesses",
    "id, owner_id, name, approved"
  )
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function getOrderPayload(order: EmailOrderContext) {
  const offer = order.offers;
  const business = offer?.businesses;

  return {
    offerTitle: offer?.title || "Surprise Bag",
    businessName: business?.name || "ArGadaagdo business",
    businessAddress: business?.address || null,
    pickupWindow: offer ? formatPickupWindow(offer, "en") : null,
    pickupCode: order.pickup_code || null,
    orderId: order.id,
    actionUrl: absoluteSiteUrl("/orders"),
    supportUrl: absoluteSiteUrl("/support"),
  };
}

function parseTimeMinutes(value: string | null | undefined) {
  if (!value) return null;
  const [hourText, minuteText] = value.slice(0, 5).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function getTbilisiTimeMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  return hour * 60 + minute;
}

function shouldSendPickupReminder(order: EmailOrderContext) {
  const offer = order.offers;
  if (!offer?.pickup_date) return false;
  if (offer.pickup_date !== getTbilisiDateKey()) return false;

  const startMinutes = parseTimeMinutes(offer.pickup_start);
  const endMinutes = parseTimeMinutes(offer.pickup_end);
  if (startMinutes === null || endMinutes === null) return false;

  const nowMinutes = getTbilisiTimeMinutes();
  const minutesUntilStart = startMinutes - nowMinutes;

  return minutesUntilStart >= 0 && minutesUntilStart <= 360 && endMinutes >= nowMinutes;
}

export async function sendReservationConfirmationEmail(
  supabase: SupabaseLikeClient,
  orderId: number
) {
  const order = await getOrderEmailContext(supabase, orderId);
  if (!order) return { ok: false, skipped: true, error: "order_not_found" };

  const profile = await getProfileById(supabase, order.user_id);
  if (!profile?.email) {
    return { ok: false, skipped: true, error: "customer_email_not_found" };
  }

  return sendTransactionalEmail({
    to: profile.email,
    event: "reservation_confirmation",
    payload: getOrderPayload(order),
    idempotencyKey: `reservation-confirmation-${order.id}`,
  });
}

export async function sendReservationCancellationEmail(
  supabase: SupabaseLikeClient,
  orderId: number
) {
  const order = await getOrderEmailContext(supabase, orderId);
  if (!order) return { ok: false, skipped: true, error: "order_not_found" };

  const profile = await getProfileById(supabase, order.user_id);
  if (!profile?.email) {
    return { ok: false, skipped: true, error: "customer_email_not_found" };
  }

  return sendTransactionalEmail({
    to: profile.email,
    event: "reservation_cancellation",
    payload: getOrderPayload(order),
    idempotencyKey: `reservation-cancellation-${order.id}`,
  });
}

export async function sendBusinessApprovalEmail(
  supabase: SupabaseLikeClient,
  businessId: number
) {
  const business = await getBusinessEmailContext(supabase, businessId);
  if (!business) {
    return { ok: false, skipped: true, error: "business_not_found" };
  }

  const profile = await getProfileById(supabase, business.owner_id);
  if (!profile?.email) {
    return { ok: false, skipped: true, error: "business_owner_email_not_found" };
  }

  return sendTransactionalEmail({
    to: profile.email,
    event: "business_approval",
    payload: {
      businessName: business.name,
      actionUrl: absoluteSiteUrl("/business/dashboard"),
      supportUrl: absoluteSiteUrl("/support"),
    },
    idempotencyKey: `business-approval-${business.id}`,
  });
}

export async function sendPickupCompletedEmails(
  supabase: SupabaseLikeClient,
  orderId: number
) {
  const order = await getOrderEmailContext(supabase, orderId);
  if (!order) return { ok: false, skipped: true, error: "order_not_found" };

  const profile = await getProfileById(supabase, order.user_id);
  if (!profile?.email) {
    return { ok: false, skipped: true, error: "customer_email_not_found" };
  }

  const payload = getOrderPayload(order);
  const pickupResult = await sendTransactionalEmail({
    to: profile.email,
    event: "pickup_completed",
    payload,
    idempotencyKey: `pickup-completed-${order.id}`,
  });

  const ratingResult = await sendTransactionalEmail({
    to: profile.email,
    event: "rating_reminder",
    payload,
    idempotencyKey: `rating-reminder-${order.id}`,
  });

  return {
    ok: pickupResult.ok && ratingResult.ok,
    pickupResult,
    ratingResult,
  };
}

export async function sendRatingReminderEmail(
  supabase: SupabaseLikeClient,
  orderId: number
) {
  const order = await getOrderEmailContext(supabase, orderId);
  if (!order) return { ok: false, skipped: true, error: "order_not_found" };

  const profile = await getProfileById(supabase, order.user_id);
  if (!profile?.email) {
    return { ok: false, skipped: true, error: "customer_email_not_found" };
  }

  return sendTransactionalEmail({
    to: profile.email,
    event: "rating_reminder",
    payload: getOrderPayload(order),
    idempotencyKey: `rating-reminder-${order.id}`,
  });
}

export async function sendPickupReminderEmail(
  supabase: SupabaseLikeClient,
  orderId: number
) {
  const order = await getOrderEmailContext(supabase, orderId);
  if (!order) return { ok: false, skipped: true, error: "order_not_found" };

  const profile = await getProfileById(supabase, order.user_id);
  if (!profile?.email) {
    return { ok: false, skipped: true, error: "customer_email_not_found" };
  }

  return sendTransactionalEmail({
    to: profile.email,
    event: "pickup_reminder",
    payload: getOrderPayload(order),
    idempotencyKey: `pickup-reminder-${order.id}-${order.offers?.pickup_date || "date"}`,
  });
}

export async function sendDuePickupReminderEmails(
  supabase: SupabaseLikeClient
) {
  const { data, error } = await fromTable<EmailOrderContext[]>(
    supabase,
    "orders",
    `
      id,
      user_id,
      status,
      pickup_code,
      offers(
        id,
        title,
        pickup_date,
        pickup_start,
        pickup_end,
        businesses(id, owner_id, name, address, business_type, approved)
      )
    `
  )
    .in("status", ["reserved", "confirmed"])
    .order("id", { ascending: false })
    .limit(500);

  if (error || !Array.isArray(data)) {
    return { ok: false, scanned: 0, sent: 0, error: error?.message };
  }

  let sent = 0;

  for (const order of data) {
    if (!shouldSendPickupReminder(order)) continue;

    const result = await sendPickupReminderEmail(supabase, order.id);
    if (result.ok) sent += 1;
  }

  return { ok: true, scanned: data.length, sent };
}
