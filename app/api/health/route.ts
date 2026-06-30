import { NextResponse } from "next/server";
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
  const secret = process.env.HEALTH_CHECK_SECRET;

  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const report = await runProductionHealthChecks({
      includeDetails: isDetailedHealthAuthorized(request),
    });

    logHealthReport(report, requestId);

    return NextResponse.json(report, {
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
