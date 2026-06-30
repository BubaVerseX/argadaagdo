import { createVerify } from "crypto";
import { absoluteSiteUrl } from "@/lib/site";
import type {
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  ProviderPaymentStatus,
  VerifiedProviderPayment,
} from "@/lib/payments/types";

type UnknownRecord = Record<string, unknown>;

type BogConfig = {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  apiBaseUrl: string;
  callbackSecret: string;
};

type BogAccessToken = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

const defaultBogCallbackPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;

function getBogConfig(): BogConfig {
  const clientId = process.env.BOG_CLIENT_ID;
  const clientSecret = process.env.BOG_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Bank of Georgia payment credentials are not configured.");
  }

  return {
    clientId,
    clientSecret,
    authUrl:
      process.env.BOG_AUTH_URL ||
      "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
    apiBaseUrl: process.env.BOG_API_BASE_URL || "https://api.bog.ge",
    callbackSecret: process.env.BOG_CALLBACK_SECRET || "",
  };
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readPath(value: unknown, path: string[]) {
  let current: unknown = value;

  for (const key of path) {
    current = asRecord(current)[key];
  }

  return current;
}

function normalizeBogStatus(status: string): ProviderPaymentStatus {
  const normalizedStatus = status.toLowerCase().trim();

  if (
    ["paid", "completed", "complete", "success", "succeeded", "approved"].includes(
      normalizedStatus
    )
  ) {
    return "paid";
  }

  if (normalizedStatus === "authorized") return "authorized";
  if (["cancelled", "canceled"].includes(normalizedStatus)) return "cancelled";
  if (normalizedStatus === "created" || normalizedStatus === "processing") {
    return "pending";
  }
  if (normalizedStatus === "expired") return "expired";
  if (normalizedStatus === "refunded" || normalizedStatus === "refund_requested") {
    return "refunded";
  }

  return "failed";
}

function findCheckoutUrl(responseBody: unknown) {
  const candidates = [
    readPath(responseBody, ["_links", "redirect", "href"]),
    readPath(responseBody, ["links", "redirect", "href"]),
    readPath(responseBody, ["redirect", "href"]),
    readPath(responseBody, ["redirect_url"]),
    readPath(responseBody, ["checkout_url"]),
    readPath(responseBody, ["url"]),
  ];

  return candidates.map(getString).find(Boolean) || "";
}

function findProviderReference(responseBody: unknown) {
  const candidates = [
    readPath(responseBody, ["id"]),
    readPath(responseBody, ["order_id"]),
    readPath(responseBody, ["payment_id"]),
    readPath(responseBody, ["body", "id"]),
    readPath(responseBody, ["body", "order_id"]),
  ];

  return candidates.map(String).find((value) => value && value !== "undefined") || "";
}

function findDetailsStatus(responseBody: unknown) {
  const candidates = [
    readPath(responseBody, ["order_status", "key"]),
    readPath(responseBody, ["status", "value"]),
    readPath(responseBody, ["status"]),
    readPath(responseBody, ["order_status", "value"]),
    readPath(responseBody, ["order_status"]),
    readPath(responseBody, ["payment_status"]),
  ];

  return candidates.map(getString).find(Boolean) || "failed";
}

function findDetailsExternalOrderId(responseBody: unknown) {
  const candidates = [
    readPath(responseBody, ["external_order_id"]),
    readPath(responseBody, ["externalOrderId"]),
    readPath(responseBody, ["order", "external_order_id"]),
  ];

  return candidates.map(getString).find(Boolean) || "";
}

function findDetailsAmount(responseBody: unknown) {
  const candidates = [
    readPath(responseBody, ["purchase_units", "request_amount"]),
    readPath(responseBody, ["purchase_units", "transfer_amount"]),
    readPath(responseBody, ["purchase_units", "total_amount"]),
    readPath(responseBody, ["purchase_units", "0", "total_amount"]),
    readPath(responseBody, ["amount"]),
    readPath(responseBody, ["total_amount"]),
  ];

  for (const candidate of candidates) {
    const amount = getNumber(candidate);
    if (amount !== null) return amount;
  }

  return null;
}

function findDetailsCurrency(responseBody: unknown) {
  const candidates = [
    readPath(responseBody, ["purchase_units", "currency_code"]),
    readPath(responseBody, ["purchase_units", "currency"]),
    readPath(responseBody, ["currency"]),
  ];

  return candidates.map(getString).find(Boolean) || null;
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(
        `Bank of Georgia request failed with status ${response.status}.`
      );
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function getBogAccessToken(config: BogConfig) {
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const body = await fetchJsonWithTimeout(config.authUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  const token = body as BogAccessToken;

  if (!token.access_token) {
    throw new Error("Bank of Georgia did not return an access token.");
  }

  return token.access_token;
}

function getCallbackUrl(config: BogConfig) {
  const callbackPath = config.callbackSecret
    ? `/api/payments/bog/callback?secret=${encodeURIComponent(
        config.callbackSecret
      )}`
    : "/api/payments/bog/callback";

  return absoluteSiteUrl(callbackPath);
}

export async function createBogPaymentSession(
  input: CreatePaymentSessionInput
): Promise<CreatePaymentSessionResult> {
  const config = getBogConfig();
  const accessToken = await getBogAccessToken(config);

  const payload = {
    callback_url: getCallbackUrl(config),
    external_order_id: input.externalOrderId,
    capture: "automatic",
    ttl: 20,
    redirect_urls: {
      success: absoluteSiteUrl(
        `/api/payments/bog/return?payment_id=${input.paymentId}&result=success`
      ),
      fail: absoluteSiteUrl(
        `/api/payments/bog/return?payment_id=${input.paymentId}&result=fail`
      ),
    },
    purchase_units: {
      currency: input.currency,
      total_amount: input.amount,
      basket: [
        {
          product_id: String(input.offerId),
          description: input.offerTitle,
          quantity: 1,
          unit_price: input.amount,
          total_price: input.amount,
        },
      ],
    },
  };

  const responseBody = await fetchJsonWithTimeout(
    `${config.apiBaseUrl}/payments/v1/ecommerce/orders`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.externalOrderId,
      },
      body: JSON.stringify(payload),
    }
  );

  const redirectUrl = findCheckoutUrl(responseBody);
  const providerReference = findProviderReference(responseBody);

  if (!redirectUrl || !providerReference) {
    throw new Error("Bank of Georgia checkout session response was incomplete.");
  }

  return {
    provider: "bog",
    providerReference,
    redirectUrl,
    externalOrderId: input.externalOrderId,
  };
}

export async function verifyBogPayment(
  providerReference: string
): Promise<VerifiedProviderPayment> {
  const config = getBogConfig();
  const accessToken = await getBogAccessToken(config);

  const responseBody = await fetchJsonWithTimeout(
    `${config.apiBaseUrl}/payments/v1/receipt/${encodeURIComponent(
      providerReference
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return {
    provider: "bog",
    providerReference,
    externalOrderId: findDetailsExternalOrderId(responseBody),
    status: normalizeBogStatus(findDetailsStatus(responseBody)),
    amount: findDetailsAmount(responseBody),
    currency: findDetailsCurrency(responseBody),
    raw: responseBody,
  };
}

export async function refundBogPayment(input: {
  providerReference: string;
  amount: number;
  currency: "GEL";
}): Promise<VerifiedProviderPayment> {
  const config = getBogConfig();
  const accessToken = await getBogAccessToken(config);
  const refundPathTemplate =
    process.env.BOG_REFUND_PATH_TEMPLATE ||
    "/payments/v1/payment/refund/{order_id}";
  const refundPath = refundPathTemplate.replace(
    "{order_id}",
    encodeURIComponent(input.providerReference)
  );

  await fetchJsonWithTimeout(`${config.apiBaseUrl}${refundPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `refund_${input.providerReference}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
    }),
  });

  return verifyBogPayment(input.providerReference);
}

export function isBogCallbackSecretValid(secret: string | null) {
  const expectedSecret = process.env.BOG_CALLBACK_SECRET;

  if (!expectedSecret) return true;

  return Boolean(secret && secret === expectedSecret);
}

export function verifyBogCallbackSignature(
  rawBody: string,
  callbackSignature: string | null
) {
  const requireSignature =
    process.env.BOG_REQUIRE_CALLBACK_SIGNATURE === "true";

  if (!callbackSignature) return !requireSignature;

  const publicKey =
    process.env.BOG_CALLBACK_PUBLIC_KEY || defaultBogCallbackPublicKey;

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(rawBody);
    verifier.end();

    return verifier.verify(publicKey, callbackSignature, "base64");
  } catch {
    return false;
  }
}
