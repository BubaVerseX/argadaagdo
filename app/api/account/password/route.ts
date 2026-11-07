import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createServiceRoleSupabaseClient,
  createUserScopedSupabaseClient,
} from "@/lib/supabaseServer";

// Change password from Settings (check-2 #33). The current password is checked
// in the database (check_user_password: 5 wrong tries lock it for 15 minutes),
// then the new one is set with the service role. Direct password changes with
// an old session need Supabase's re-authentication code
// (security_update_password_require_reauthentication), so a stolen session
// can't set a new password on its own.

// Same rule as the sign-up form (lib/useAuthForm.ts meetsPasswordRule).
function meetsPasswordRule(value: string) {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

function extractBearerToken(request: Request) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!meetsPasswordRule(newPassword) || newPassword.trim() !== newPassword) {
      return NextResponse.json(
        { error: "Password needs at least 8 characters, with a lowercase letter, an uppercase letter and a number." },
        { status: 400 }
      );
    }

    const userClient = createUserScopedSupabaseClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);
    if (userError || !user) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const serviceClient = createServiceRoleSupabaseClient();
    const { data: check, error: checkError } = await serviceClient.rpc("check_user_password", {
      p_user_id: user.id,
      p_password: currentPassword,
    });

    if (checkError) {
      logger.error("Password check failed", { userId: user.id, error: checkError.message });
      return NextResponse.json({ error: "The password couldn't be changed. Please try again." }, { status: 500 });
    }
    if (check === "locked") {
      return NextResponse.json(
        { error: "Too many wrong passwords. Please wait 15 minutes and try again." },
        { status: 429 }
      );
    }
    if (check !== "ok") {
      return NextResponse.json({ error: "Your current password is wrong." }, { status: 403 });
    }

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateError) {
      logger.error("Password update failed", { userId: user.id, error: updateError.message });
      return NextResponse.json({ error: "The password couldn't be changed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Password route failed", { error });
    return NextResponse.json({ error: "The password couldn't be changed. Please try again." }, { status: 500 });
  }
}
