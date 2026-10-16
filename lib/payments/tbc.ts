import { timingSafeEqual } from "crypto";
import { absoluteSiteUrl } from "@/lib/site";
import type {
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  ProviderPaymentStatus,
  VerifiedProviderPayment,
} from "@/lib/payments/types";

type UnknownRecord = Record<string, unknown>;

type TbcConfig = {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  apiBaseUrl: string;
  callbackSecret: string;
};

function isProductionPaymentRuntime() {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

function getTbcConfig(): TbcConfig {
  const clientId = process.env.TBC_CLIENT_ID;
  const clientSecret = process.env.TBC_CLIENT_SECRET;
  const apiKey = process.env.TBC_API_KEY;
  const callbackSecret = process.env.TBC_CALLBACK_SECRET || "";

  if (!clientId || !clientSecret || !apiKey) {
    throw new Error("TBC payment credentials are not configured.");
  }

  if (isProductionPaymentRuntime() && !callbackSecret) {
    throw new Error("TBC callback secret is not configured.");
  }

  return {
    clientId,
    clientSecret,
    apiKey,
    apiBaseUrl: process.env.TBC_API_BASE_URL || "https://api.tbcbank.ge/v1",
    callbackSecret,
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

function normalizeTbcStatus(status: string): ProviderPaymentStatus {
  switch (status.trim().toLowerCase()) {
    case "succeeded":
      return "paid";
    case "waitingconfirm":
      return "authorized";
    case "created":
    case "processing":
    case "cancelpaymentprocessing":
    case "paymentcompletionprocessing":
      return "pending";
    case "expired":
      return "expired";
    case "returned":
    case "partialreturned":
      return "refunded";
    case "failed":
      return "failed";
    default:
      // An empty or unknown status is treated as still pending. Mapping it to
      // "failed" would cancel the order and release the stock while TBC may
      // still capture (or already have captured) the money. Pending holds are
      // released by expire_pending_provider_payments.
      return "pending";
  }
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
      throw new Error(`TBC request failed with status ${response.status}.`);
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function getTbcAccessToken(config: TbcConfig) {
  const body = asRecord(
    await fetchJsonWithTimeout(`${config.apiBaseUrl}/tpay/access-token`, {
      method: "POST",
      headers: {
        apikey: config.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    })
  );

  const accessToken = getString(body.access_token);

  if (!accessToken) {
    throw new Error("TBC did not return an access token.");
  }

  return accessToken;
}

function authHeaders(config: TbcConfig, accessToken: string) {
  return {
    apikey: config.apiKey,
    Authorization: `Bearer ${accessToken}`,
  };
}

function getCallbackUrl(config: TbcConfig) {
  const callbackPath = config.callbackSecret
    ? `/api/payments/tbc/callback?secret=${encodeURIComponent(
        config.callbackSecret
      )}`
    : "/api/payments/tbc/callback";

  return absoluteSiteUrl(callbackPath);
}

export async function createTbcPaymentSession(
  input: CreatePaymentSessionInput
): Promise<CreatePaymentSessionResult> {
  const config = getTbcConfig();
  const accessToken = await getTbcAccessToken(config);

  const responseBody = asRecord(
    await fetchJsonWithTimeout(`${config.apiBaseUrl}/tpay/payments`, {
      method: "POST",
      headers: {
        ...authHeaders(config, accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: input.currency, total: input.amount },
        returnurl: absoluteSiteUrl(
          `/api/payments/tbc/return?payment_id=${input.paymentId}`
        ),
        callbackUrl: getCallbackUrl(config),
        merchantPaymentId: input.externalOrderId,
        description: input.offerTitle.slice(0, 30),
        expirationMinutes: 12,
        language: "KA",
        // TBC split: `extra` is the recipient's TBC IBAN and `extra2` the amount
        // transferred to it. TBC only allows split on some payment methods
        // (5 = Web QR, 7 = card, 9 = internet bank), so they are pinned here.
        ...(input.split
          ? {
              extra: input.split.iban,
              extra2: input.split.amount.toFixed(2),
              methods: [5, 7, 9],
            }
          : {}),
      }),
    })
  );

  const links = Array.isArray(responseBody.links) ? responseBody.links : [];
  const approval = links
    .map(asRecord)
    .find((link) => link.rel === "approval_url");
  const redirectUrl = getString(approval?.uri);
  const providerReference = getString(responseBody.payId);

  if (!redirectUrl || !providerReference) {
    throw new Error("TBC checkout session response was incomplete.");
  }

  return {
    provider: "tbc",
    providerReference,
    redirectUrl,
    externalOrderId: input.externalOrderId,
  };
}

export async function verifyTbcPayment(
  providerReference: string
): Promise<VerifiedProviderPayment> {
  const config = getTbcConfig();
  const accessToken = await getTbcAccessToken(config);

  const responseBody = asRecord(
    await fetchJsonWithTimeout(
      `${config.apiBaseUrl}/tpay/payments/${encodeURIComponent(
        providerReference
      )}`,
      {
        method: "GET",
        headers: authHeaders(config, accessToken),
      }
    )
  );

  return {
    provider: "tbc",
    providerReference,
    externalOrderId: getString(responseBody.merchantPaymentId),
    status: normalizeTbcStatus(getString(responseBody.status)),
    amount: getNumber(responseBody.amount),
    currency: getString(responseBody.currency) || null,
    raw: responseBody,
  };
}

export async function refundTbcPayment(input: {
  providerReference: string;
  amount: number;
  currency: "GEL";
}): Promise<VerifiedProviderPayment> {
  const config = getTbcConfig();
  const accessToken = await getTbcAccessToken(config);

  await fetchJsonWithTimeout(
    `${config.apiBaseUrl}/tpay/payments/${encodeURIComponent(
      input.providerReference
    )}/cancel`,
    {
      method: "POST",
      headers: {
        ...authHeaders(config, accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: input.amount }),
    }
  );

  const verified = await verifyTbcPayment(input.providerReference);

  // TBC reports CancelPaymentProcessing (mapped to "pending") while the
  // reversal settles. The cancel request was accepted, so treat it as refunded;
  // a failed request would have thrown above.
  if (verified.status === "pending") {
    return { ...verified, status: "refunded" };
  }

  return verified;
}

export function isTbcCallbackSecretValid(secret: string | null) {
  const expectedSecret = process.env.TBC_CALLBACK_SECRET;

  if (!expectedSecret) return !isProductionPaymentRuntime();
  if (!secret) return false;

  const providedBuffer = Buffer.from(secret);
  const expectedBuffer = Buffer.from(expectedSecret);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
