import { NextResponse } from "next/server";
import { isPushConfigured, sendPush, type PushDevice } from "@/lib/push/send";
import {
  createServiceRoleSupabaseClient,
  createUserScopedSupabaseClient,
} from "@/lib/supabaseServer";

// "Send me a test notification" from the app's Settings: only ever to the
// signed-in person's own devices, at most once a minute per instance.
const lastSent = new Map<string, number>();

export async function POST(request: Request) {
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const {
    data: { user },
  } = await createUserScopedSupabaseClient(accessToken).auth.getUser(accessToken);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  if (Date.now() - (lastSent.get(user.id) || 0) < 60_000) {
    return NextResponse.json({ ok: false, reason: "too_soon" }, { status: 429 });
  }
  lastSent.set(user.id, Date.now());

  const { data } = await createServiceRoleSupabaseClient()
    .from("push_devices")
    .select("token, platform, language")
    .eq("user_id", user.id);
  const devices = (data || []) as (PushDevice & { language: string })[];
  const georgian = devices.filter((device) => device.language !== "en");
  const english = devices.filter((device) => device.language === "en");

  const results = await Promise.all([
    sendPush(georgian, {
      title: "ArGadaagdo 💚",
      body: "შეტყობინებები მუშაობს. წაღების დღეს შეგახსენებთ.",
      url: "/notifications",
      collapseKey: "test",
    }),
    sendPush(english, {
      title: "ArGadaagdo 💚",
      body: "Notifications work. We'll remind you on pickup day.",
      url: "/notifications",
      collapseKey: "test",
    }),
  ]);

  return NextResponse.json({
    ok: true,
    devices: devices.length,
    sent: results.reduce((sum, result) => sum + result.sent, 0),
  });
}
