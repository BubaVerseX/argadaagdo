import { formatAppError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export type ApplicationHealthStatus = "ok" | "warning" | "error";

export type ApplicationHealthItem = {
  title: string;
  status: ApplicationHealthStatus;
  value: string;
  detail: string;
};

function getStatusLabel(status: ApplicationHealthStatus) {
  if (status === "ok") return "OK";
  if (status === "warning") return "Review";
  return "Problem";
}

export function getApplicationHealthStatusLabel(
  status: ApplicationHealthStatus
) {
  return getStatusLabel(status);
}

export async function checkApplicationHealth(): Promise<ApplicationHealthItem[]> {
  const envOk = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const buildVersion =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "local";

  const [databaseResult, storageResult] = await Promise.allSettled([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.storage.from("offer-images").list("", { limit: 1 }),
  ]);

  const databaseError =
    databaseResult.status === "fulfilled" ? databaseResult.value.error : null;
  const storageError =
    storageResult.status === "fulfilled" ? storageResult.value.error : null;

  const realtimeReady = typeof supabase.channel === "function";

  return [
    {
      title: "Environment",
      status: envOk ? "ok" : "error",
      value: envOk ? "Configured" : "Missing",
      detail: envOk
        ? "Public Supabase environment variables are available."
        : "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
    },
    {
      title: "Supabase database",
      status: databaseError ? "error" : "ok",
      value: databaseError ? "Connection issue" : "Connected",
      detail: databaseError
        ? formatAppError(databaseError).developerMessage
        : "Database responded to an admin health check.",
    },
    {
      title: "Storage bucket",
      status: storageError ? "warning" : "ok",
      value: storageError ? "Check policy" : "Available",
      detail: storageError
        ? formatAppError(storageError).developerMessage
        : "offer-images bucket is reachable from the app.",
    },
    {
      title: "Realtime client",
      status: realtimeReady ? "ok" : "warning",
      value: realtimeReady ? "Ready" : "Unavailable",
      detail: realtimeReady
        ? "Supabase Realtime client is available for subscriptions."
        : "Realtime client was not available in this browser session.",
    },
    {
      title: "Build version",
      status: "ok",
      value: buildVersion,
      detail:
        buildVersion === "local"
          ? "Local build or commit SHA is not exposed."
          : "Latest exposed deployment identifier.",
    },
  ];
}
