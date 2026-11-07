import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createServiceRoleSupabaseClient,
  createUserScopedSupabaseClient,
} from "@/lib/supabaseServer";

// In-app account deletion (required by Apple and Google). Orders and payments
// are accounting records, so anonymize_account_for_deletion strips the person
// from them instead of deleting them; deleting the auth user then removes the
// profile (email) and favorites. See
// supabase/migrations/20261016104337_account_deletion.sql.

const ACTIVE_RESERVATIONS_MESSAGE =
  "You have a reservation in progress. Pick it up or cancel it, then delete your account.";
const BUSINESS_ACTIVE_RESERVATIONS_MESSAGE =
  "Your business has reservations in progress. Complete or resolve them, then delete your account.";
const PASSWORD_REQUIRED_MESSAGE = "Enter your password to delete your account.";
const PASSWORD_WRONG_MESSAGE = "That password is wrong.";
const PASSWORD_LOCKED_MESSAGE = "Too many wrong passwords. Please wait 15 minutes and try again.";
const DELETE_FAILED_MESSAGE =
  "Your account could not be deleted. Please try again or contact support.";

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

// Business pictures (logo, cover, offer and template photos) live in the
// public offer-images bucket under business-<id>/; they go with the account.
async function removeBusinessImages(
  serviceClient: ReturnType<typeof createServiceRoleSupabaseClient>,
  businessIds: number[]
) {
  const bucket = serviceClient.storage.from("offer-images");

  for (const businessId of businessIds) {
    const folder = `business-${businessId}`;
    const { data: files, error } = await bucket.list(folder, { limit: 1000 });

    if (error) {
      logger.error("Business images could not be listed", { businessId, error: error.message });
      continue;
    }

    if (files && files.length > 0) {
      const { error: removeError } = await bucket.remove(files.map((file) => `${folder}/${file.name}`));
      if (removeError) {
        logger.error("Business images could not be removed", { businessId, error: removeError.message });
      }
    }
  }
}

// The privacy policy promises this: the owner's name, phone, IBAN and registry
// extract go (anonymize_account_for_deletion); the company's legal name and ID
// code stay with the order records for 6 years.
async function removeVerificationPersonalData(
  serviceClient: ReturnType<typeof createServiceRoleSupabaseClient>,
  userId: string,
  businessIds: number[]
) {
  if (businessIds.length > 0) {
    const { error } = await serviceClient
      .from("business_verifications")
      .update({
        owner_full_name: null,
        verified_phone: null,
        registry_extract_path: null,
      })
      .in("business_id", businessIds);

    if (error) {
      logger.error("Verification data could not be removed", {
        userId,
        error: error.message,
      });
    }
  }

  const bucket = serviceClient.storage.from("business-documents");
  const { data: files, error: listError } = await bucket.list(userId);

  if (listError) {
    logger.error("Registry extracts could not be listed", {
      userId,
      error: listError.message,
    });
    return;
  }

  if (files && files.length > 0) {
    const { error: removeError } = await bucket.remove(
      files.map((file) => `${userId}/${file.name}`)
    );

    if (removeError) {
      logger.error("Registry extracts could not be removed", {
        userId,
        error: removeError.message,
      });
    }
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please sign in to delete your account." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    if (body?.confirm !== true) {
      return NextResponse.json(
        { error: "Please confirm that you want to delete your account." },
        { status: 400 }
      );
    }

    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json({ error: PASSWORD_REQUIRED_MESSAGE }, { status: 400 });
    }

    const userClient = createUserScopedSupabaseClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please sign in to delete your account." },
        { status: 401 }
      );
    }

    const serviceClient = createServiceRoleSupabaseClient();

    // A session alone isn't enough: the password must match (check-2 #33).
    const { data: passwordCheck, error: passwordError } = await serviceClient.rpc("check_user_password", {
      p_user_id: user.id,
      p_password: password,
    });

    if (passwordError) {
      logger.error("Password check failed before deletion", { userId: user.id, error: passwordError.message });
      return NextResponse.json({ error: DELETE_FAILED_MESSAGE }, { status: 500 });
    }

    if (passwordCheck === "locked") {
      return NextResponse.json({ error: PASSWORD_LOCKED_MESSAGE }, { status: 429 });
    }

    if (passwordCheck !== "ok") {
      return NextResponse.json({ error: PASSWORD_WRONG_MESSAGE }, { status: 403 });
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if ((profile as { role?: string } | null)?.role === "admin") {
      // Avoid locking the marketplace out of its own admin tools by accident.
      return NextResponse.json(
        { error: "Admin accounts can't be deleted from the app." },
        { status: 403 }
      );
    }

    // Read before anonymizing, which detaches the businesses from the owner.
    const { data: ownedBusinesses } = await serviceClient
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id);

    const { error: anonymizeError } = await serviceClient.rpc(
      "anonymize_account_for_deletion",
      { p_user_id: user.id }
    );

    if (anonymizeError) {
      const message = anonymizeError.message || "";

      if (message.includes("Business has active reservations")) {
        return NextResponse.json(
          { error: BUSINESS_ACTIVE_RESERVATIONS_MESSAGE },
          { status: 409 }
        );
      }

      if (message.includes("Account has active reservations")) {
        return NextResponse.json(
          { error: ACTIVE_RESERVATIONS_MESSAGE },
          { status: 409 }
        );
      }

      logger.error("Account anonymization failed", {
        userId: user.id,
        error: message,
      });
      return NextResponse.json({ error: DELETE_FAILED_MESSAGE }, { status: 500 });
    }

    const ownedBusinessIds = (ownedBusinesses || []).map((business: { id: number }) => business.id);

    await removeVerificationPersonalData(serviceClient, user.id, ownedBusinessIds);
    await removeBusinessImages(serviceClient, ownedBusinessIds);

    // The profile photo (private bucket, one file per person). Removing a
    // file that isn't there is not an error.
    const { error: avatarError } = await serviceClient.storage
      .from("avatars")
      .remove([`${user.id}/avatar.jpg`]);

    if (avatarError && !/not.?found/i.test(avatarError.message)) {
      logger.error("Profile photo could not be removed", {
        userId: user.id,
        error: avatarError.message,
      });
    }

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      // Records are already anonymized; a retry finishes the deletion.
      logger.error("Auth user deletion failed after anonymization", {
        userId: user.id,
        error: deleteError.message,
      });
      return NextResponse.json({ error: DELETE_FAILED_MESSAGE }, { status: 500 });
    }

    logger.info("Account deleted", { userId: user.id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error("Account deletion route failed", { error });
    return NextResponse.json({ error: DELETE_FAILED_MESSAGE }, { status: 500 });
  }
}
