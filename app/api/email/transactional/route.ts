import { NextResponse } from "next/server";
import { isEmailConfirmed } from "@/lib/auth";
import {
  getOrderEmailContext,
  sendBusinessApprovalEmail,
  sendPickupCompletedEmails,
  sendPickupReminderEmail,
  sendRatingReminderEmail,
  sendReservationCancellationEmail,
  sendReservationConfirmationEmail,
} from "@/lib/email/events";
import type { TransactionalEmailEvent } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import {
  createServiceRoleSupabaseClient,
  createUserScopedSupabaseClient,
} from "@/lib/supabaseServer";

type TransactionalEmailRequestBody = {
  event?: TransactionalEmailEvent;
  orderId?: number | string;
  businessId?: number | string;
};

type ProfileRole = {
  role: string | null;
};

const orderEvents = new Set<TransactionalEmailEvent>([
  "reservation_confirmation",
  "reservation_cancellation",
  "pickup_reminder",
  "pickup_completed",
  "rating_reminder",
]);

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function toPositiveNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

async function getUserRole(supabase: ReturnType<typeof createServiceRoleSupabaseClient>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return ((data as ProfileRole | null)?.role || "customer").toLowerCase();
}

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please sign in before sending notifications." },
        { status: 401 }
      );
    }

    const userClient = createUserScopedSupabaseClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please sign in before sending notifications." },
        { status: 401 }
      );
    }

    if (!isEmailConfirmed(user)) {
      return NextResponse.json(
        { error: "Please verify your email before using ArGadaagdo." },
        { status: 403 }
      );
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as TransactionalEmailRequestBody;
    const event = body.event;

    if (!event) {
      return NextResponse.json(
        { error: "Notification event is required." },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleSupabaseClient();
    const role = await getUserRole(supabase, user.id);

    if (event === "business_approval") {
      const businessId = toPositiveNumber(body.businessId);

      if (!businessId) {
        return NextResponse.json(
          { error: "Business ID is required." },
          { status: 400 }
        );
      }

      if (role !== "admin") {
        return NextResponse.json(
          { error: "Only admins can send business approval emails." },
          { status: 403 }
        );
      }

      const result = await sendBusinessApprovalEmail(supabase, businessId);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (!orderEvents.has(event)) {
      return NextResponse.json(
        { error: "Unsupported notification event." },
        { status: 400 }
      );
    }

    const orderId = toPositiveNumber(body.orderId);

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    const order = await getOrderEmailContext(supabase, orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order could not be found." },
        { status: 404 }
      );
    }

    const businessOwnerId = order.offers?.businesses?.owner_id;
    const isCustomerOwner = order.user_id === user.id;
    const isBusinessOwner = businessOwnerId === user.id && role === "business";
    const isAdmin = role === "admin";

    if (
      ["reservation_confirmation", "reservation_cancellation", "pickup_reminder", "rating_reminder"].includes(
        event
      ) &&
      !isCustomerOwner &&
      !isAdmin
    ) {
      return NextResponse.json(
        { error: "This notification is not available for your account." },
        { status: 403 }
      );
    }

    if (event === "pickup_completed" && !isBusinessOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Only the business owner can send pickup completion emails." },
        { status: 403 }
      );
    }

    if (event === "reservation_confirmation") {
      const result = await sendReservationConfirmationEmail(supabase, orderId);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (event === "reservation_cancellation") {
      const result = await sendReservationCancellationEmail(supabase, orderId);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (event === "pickup_reminder") {
      const result = await sendPickupReminderEmail(supabase, orderId);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (event === "rating_reminder") {
      const result = await sendRatingReminderEmail(supabase, orderId);
      return NextResponse.json({ ok: result.ok, result });
    }

    const result = await sendPickupCompletedEmails(supabase, orderId);
    return NextResponse.json({ ok: result.ok, result });
  } catch (error) {
    logger.error("Transactional email route failed", { error });
    return NextResponse.json(
      { error: "Notification email could not be sent." },
      { status: 500 }
    );
  }
}
