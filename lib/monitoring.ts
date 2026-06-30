import { logger } from "@/lib/logger";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

export type HealthStatus = "ok" | "warning" | "error";

export type HealthCheck = {
  name: string;
  label: string;
  status: HealthStatus;
  message: string;
  durationMs?: number;
  details?: string[];
};

export type HealthReport = {
  app: "argadaagdo";
  status: HealthStatus;
  timestamp: string;
  durationMs: number;
  version: string;
  environment: string;
  region: string;
  deployment: string;
  checks: HealthCheck[];
};

type EnvRequirement = {
  name: string;
  required: boolean;
  productionCritical?: boolean;
  description: string;
};

const HEALTH_TIMEOUT_MS = 5000;

const envRequirements: EnvRequirement[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    productionCritical: true,
    description: "Connects the app to the Supabase project.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    productionCritical: true,
    description: "Allows browser clients to use Supabase under RLS.",
  },
  {
    name: "NEXT_PUBLIC_SITE_URL",
    required: true,
    productionCritical: true,
    description: "Used for canonical URLs, callbacks and email links.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    productionCritical: true,
    description: "Required for server-side operational health checks.",
  },
  {
    name: "BOG_CLIENT_ID",
    required: false,
    productionCritical: true,
    description: "Required when real Bank of Georgia payment sessions are live.",
  },
  {
    name: "BOG_CLIENT_SECRET",
    required: false,
    productionCritical: true,
    description: "Required when real Bank of Georgia payment sessions are live.",
  },
  {
    name: "BOG_CALLBACK_SECRET",
    required: false,
    productionCritical: true,
    description: "Protects payment provider callback handling.",
  },
  {
    name: "RESEND_API_KEY",
    required: false,
    productionCritical: true,
    description: "Required for transactional email delivery.",
  },
  {
    name: "TRANSACTIONAL_EMAIL_FROM",
    required: false,
    productionCritical: true,
    description: "Required for production transactional email sender identity.",
  },
  {
    name: "CRON_SECRET",
    required: false,
    productionCritical: true,
    description: "Protects scheduled operational routes.",
  },
  {
    name: "HEALTH_CHECK_SECRET",
    required: false,
    productionCritical: false,
    description: "Allows detailed authenticated health check responses.",
  },
];

function getRuntimeVersion() {
  return (
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "local"
  );
}

function getDeploymentEnvironment() {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
}

function getRegion() {
  return (
    process.env.VERCEL_REGION ||
    process.env.AWS_REGION ||
    process.env.FUNCTION_REGION ||
    "unknown"
  );
}

function getDeploymentId() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "local"
  );
}

function isProductionRuntime() {
  return getDeploymentEnvironment() === "production";
}

function getOverallStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "ok";
}

function redactCheck(check: HealthCheck): HealthCheck {
  return {
    name: check.name,
    label: check.label,
    status: check.status,
    message: check.message,
    durationMs: check.durationMs,
  };
}

function getElapsed(startedAt: number) {
  return Date.now() - startedAt;
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = HEALTH_TIMEOUT_MS
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`Health check timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function validateEnvironment(): HealthCheck {
  const missingRequired = envRequirements.filter(
    (item) => item.required && !process.env[item.name]
  );
  const missingProductionCritical = envRequirements.filter(
    (item) =>
      !item.required &&
      item.productionCritical &&
      isProductionRuntime() &&
      !process.env[item.name]
  );

  if (missingRequired.length > 0) {
    return {
      name: "environment",
      label: "Environment variables",
      status: "error",
      message: `${missingRequired.length} required environment variable(s) missing.`,
      details: missingRequired.map(
        (item) => `${item.name}: ${item.description}`
      ),
    };
  }

  if (missingProductionCritical.length > 0) {
    return {
      name: "environment",
      label: "Environment variables",
      status: "warning",
      message: `${missingProductionCritical.length} production variable(s) should be configured before launch.`,
      details: missingProductionCritical.map(
        (item) => `${item.name}: ${item.description}`
      ),
    };
  }

  return {
    name: "environment",
    label: "Environment variables",
    status: "ok",
    message: "Required runtime environment variables are configured.",
    details: envRequirements
      .filter((item) => process.env[item.name])
      .map((item) => `${item.name}: configured`),
  };
}

export async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startedAt = Date.now();

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { error, count } = await withTimeout<{
      error: { message: string } | null;
      count: number | null;
    }>(
      supabase.from("businesses").select("id", {
        count: "exact",
        head: true,
      })
    );

    if (error) {
      return {
        name: "database",
        label: "Supabase database",
        status: "error",
        message: "Database health query failed.",
        durationMs: getElapsed(startedAt),
        details: [error.message],
      };
    }

    return {
      name: "database",
      label: "Supabase database",
      status: "ok",
      message: "Database responded successfully.",
      durationMs: getElapsed(startedAt),
      details: [`businesses row count visible to service role: ${count ?? 0}`],
    };
  } catch (error) {
    return {
      name: "database",
      label: "Supabase database",
      status: "error",
      message: "Database health check could not run.",
      durationMs: getElapsed(startedAt),
      details: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

export async function checkStorageHealth(): Promise<HealthCheck> {
  const startedAt = Date.now();

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { error, data } = await withTimeout<{
      error: { message: string } | null;
      data: unknown[] | null;
    }>(
      supabase.storage.from("offer-images").list("", { limit: 1 })
    );

    if (error) {
      return {
        name: "storage",
        label: "Supabase Storage",
        status: "error",
        message: "offer-images bucket health check failed.",
        durationMs: getElapsed(startedAt),
        details: [error.message],
      };
    }

    return {
      name: "storage",
      label: "Supabase Storage",
      status: "ok",
      message: "offer-images bucket is reachable.",
      durationMs: getElapsed(startedAt),
      details: [`sample object count returned: ${data?.length ?? 0}`],
    };
  } catch (error) {
    return {
      name: "storage",
      label: "Supabase Storage",
      status: "error",
      message: "Storage health check could not run.",
      durationMs: getElapsed(startedAt),
      details: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

export async function runProductionHealthChecks({
  includeDetails = false,
}: {
  includeDetails?: boolean;
} = {}): Promise<HealthReport> {
  const startedAt = Date.now();
  const environmentCheck = validateEnvironment();
  const [databaseCheck, storageCheck] = await Promise.all([
    checkDatabaseHealth(),
    checkStorageHealth(),
  ]);
  const checks = [environmentCheck, databaseCheck, storageCheck];
  const status = getOverallStatus(checks);
  const preparedChecks = includeDetails ? checks : checks.map(redactCheck);

  return {
    app: "argadaagdo",
    status,
    timestamp: new Date().toISOString(),
    durationMs: getElapsed(startedAt),
    version: getRuntimeVersion(),
    environment: getDeploymentEnvironment(),
    region: getRegion(),
    deployment: getDeploymentId(),
    checks: preparedChecks,
  };
}

export function logHealthReport(report: HealthReport, requestId?: string | null) {
  const context = {
    requestId,
    status: report.status,
    durationMs: report.durationMs,
    version: report.version,
    checks: report.checks.map((check) => ({
      name: check.name,
      status: check.status,
      durationMs: check.durationMs,
    })),
  };

  if (report.status === "error") {
    logger.error("Production health check failed", context);
    return;
  }

  if (report.status === "warning") {
    logger.warn("Production health check degraded", context);
    return;
  }

  logger.info("Production health check passed", context);
}

export function logRuntimeStartup() {
  const environmentCheck = validateEnvironment();

  logger.info("ArGadaagdo runtime initialized", {
    version: getRuntimeVersion(),
    environment: getDeploymentEnvironment(),
    region: getRegion(),
    environmentStatus: environmentCheck.status,
  });
}
