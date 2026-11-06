import { createSign, createPrivateKey, type KeyObject } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";
import { logger } from "@/lib/logger";

// Push notifications, server side only. iOS devices get them straight from
// Apple (APNs, token auth with a .p8 key); Android devices through Firebase
// Cloud Messaging (HTTP v1, service account). Each half does nothing until its
// environment variables are set, so this is safe to ship before the keys:
//
//   APNS_KEY_P8         contents of AuthKey_XXXXXXXXXX.p8 (newlines as \n are fine)
//   APNS_KEY_ID         the key's 10-character ID
//   APNS_TEAM_ID        Apple team ID (9TVP238KLC)
//   APNS_BUNDLE_ID      com.argadaagdo.app (default)
//   APNS_SANDBOX=true   only for Xcode debug builds; store builds use production
//   FCM_SERVICE_ACCOUNT_JSON   the Firebase service account key file's JSON

export type PushMessage = {
  title: string;
  body: string;
  /** App path opened on tap, e.g. /orders. */
  url: string;
  /** Same key = the newer notification replaces the older one on the phone. */
  collapseKey: string;
};

export type PushDevice = { token: string; platform: "ios" | "android" };

type SendResult = { token: string; ok: boolean; gone: boolean };

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

function signJwt(header: object, claims: object, key: KeyObject, algorithm: "ES256" | "RS256") {
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("SHA256");
  signer.update(unsigned);
  const signature =
    algorithm === "ES256"
      ? signer.sign({ key, dsaEncoding: "ieee-p1363" })
      : signer.sign(key);
  return `${unsigned}.${base64url(signature)}`;
}

// ---------------------------------------------------------------- APNs (iOS)

let apnsToken: { value: string; at: number } | null = null;

function apnsConfig() {
  const key = process.env.APNS_KEY_P8?.replace(/\\n/g, "\n");
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!key || !keyId || !teamId) return null;
  return {
    key,
    keyId,
    teamId,
    bundleId: process.env.APNS_BUNDLE_ID || "com.argadaagdo.app",
    host:
      process.env.APNS_SANDBOX === "true"
        ? "https://api.sandbox.push.apple.com"
        : "https://api.push.apple.com",
  };
}

function apnsAuthToken(config: NonNullable<ReturnType<typeof apnsConfig>>) {
  // Apple accepts a token for an hour and rejects refreshing more than every 20 min.
  if (apnsToken && Date.now() - apnsToken.at < 40 * 60 * 1000) return apnsToken.value;
  const value = signJwt(
    { alg: "ES256", kid: config.keyId },
    { iss: config.teamId, iat: Math.floor(Date.now() / 1000) },
    createPrivateKey(config.key),
    "ES256"
  );
  apnsToken = { value, at: Date.now() };
  return value;
}

function apnsRequest(
  session: ClientHttp2Session,
  config: NonNullable<ReturnType<typeof apnsConfig>>,
  token: string,
  message: PushMessage
) {
  return new Promise<SendResult>((resolve) => {
    const body = JSON.stringify({
      aps: { alert: { title: message.title, body: message.body }, sound: "default" },
      url: message.url,
    });
    const request = session.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${apnsAuthToken(config)}`,
      "apns-topic": config.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-collapse-id": message.collapseKey.slice(0, 64),
      "content-type": "application/json",
    });
    let status = 0;
    let response = "";
    request.setTimeout(8000, () => request.close());
    request.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    request.on("data", (chunk) => {
      response += chunk;
    });
    request.on("close", () => {
      // 410 = the app was removed; 400 BadDeviceToken = a token for another environment.
      const gone = status === 410 || (status === 400 && response.includes("BadDeviceToken"));
      if (status !== 200 && !gone) {
        logger.warn("APNs push not sent", { status, response: response.slice(0, 200) });
      }
      resolve({ token, ok: status === 200, gone });
    });
    request.on("error", () => resolve({ token, ok: false, gone: false }));
    request.end(body);
  });
}

async function sendApns(tokens: string[], message: PushMessage) {
  const config = apnsConfig();
  if (!config || tokens.length === 0) return [];
  const session = connect(config.host);
  session.on("error", (error) => logger.warn("APNs connection failed", { error: error.message }));
  try {
    return await Promise.all(tokens.map((token) => apnsRequest(session, config, token, message)));
  } finally {
    session.close();
  }
}

// --------------------------------------------------------- FCM (Android)

let fcmAccess: { value: string; expires: number } | null = null;

function fcmConfig() {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const account = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
    return account.project_id && account.client_email && account.private_key ? account : null;
  } catch {
    logger.warn("FCM_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
}

async function fcmAccessToken(account: NonNullable<ReturnType<typeof fcmConfig>>) {
  if (fcmAccess && fcmAccess.expires > Date.now() + 60_000) return fcmAccess.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    createPrivateKey(account.private_key),
    "RS256"
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const result = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!response.ok || !result?.access_token) throw new Error(`FCM auth failed: HTTP ${response.status}`);
  fcmAccess = { value: result.access_token, expires: Date.now() + (result.expires_in || 3600) * 1000 };
  return fcmAccess.value;
}

async function sendFcm(tokens: string[], message: PushMessage): Promise<SendResult[]> {
  const account = fcmConfig();
  if (!account || tokens.length === 0) return [];
  let accessToken: string;
  try {
    accessToken = await fcmAccessToken(account);
  } catch (error) {
    logger.warn("FCM push not sent", { error: error instanceof Error ? error.message : error });
    return [];
  }

  return Promise.all(
    tokens.map(async (token) => {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: { url: message.url },
              android: {
                priority: "high",
                collapse_key: message.collapseKey,
                notification: { tag: message.collapseKey, color: "#0F3A32" },
              },
            },
          }),
          signal: AbortSignal.timeout(8000),
        }
      ).catch(() => null);
      const text = response ? await response.text().catch(() => "") : "";
      const gone = response?.status === 404 || text.includes("UNREGISTERED");
      if (response && !response.ok && !gone) {
        logger.warn("FCM push not sent", { status: response.status, response: text.slice(0, 200) });
      }
      return { token, ok: Boolean(response?.ok), gone };
    })
  );
}

export function isPushConfigured() {
  return Boolean(apnsConfig() || fcmConfig());
}

/** Sends to the given devices; returns the tokens that no longer exist. */
export async function sendPush(devices: PushDevice[], message: PushMessage) {
  const [ios, android] = await Promise.all([
    sendApns(devices.filter((d) => d.platform === "ios").map((d) => d.token), message),
    sendFcm(devices.filter((d) => d.platform === "android").map((d) => d.token), message),
  ]);
  const results = [...ios, ...android];
  return {
    sent: results.filter((r) => r.ok).length,
    goneTokens: results.filter((r) => r.gone).map((r) => r.token),
  };
}
