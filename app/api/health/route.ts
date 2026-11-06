import { NextResponse } from "next/server";
import { isBearerSecretAuthorized } from "@/lib/requestAuth";
import {
  logHealthReport,
  runProductionHealthChecks,
} from "@/lib/monitoring";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function getRequestId(request: Request) {
  return (
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    crypto.randomUUID()
  );
}

function isDetailedHealthAuthorized(request: Request) {
  return isBearerSecretAuthorized(request, process.env.HEALTH_CHECK_SECRET);
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const detailed = isDetailedHealthAuthorized(request);
    const report = await runProductionHealthChecks({ includeDetails: detailed });

    logHealthReport(report, requestId);

    // Without the secret, only the overall status: no version, region or
    // configuration hints for strangers.
    const body = detailed
      ? report
      : { app: report.app, status: report.status, timestamp: report.timestamp };

    return NextResponse.json(body, {
      status: report.status === "error" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    logger.error("Health endpoint failed unexpectedly", { requestId, error });

    return NextResponse.json(
      {
        app: "argadaagdo",
        status: "error",
        timestamp: new Date().toISOString(),
        requestId,
        checks: [
          {
            name: "health_endpoint",
            label: "Health endpoint",
            status: "error",
            message: "Health endpoint failed unexpectedly.",
          },
        ],
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Request-Id": requestId,
        },
      }
    );
  }
}
