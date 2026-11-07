import { NextResponse } from "next/server";
import { isBearerSecretAuthorized } from "@/lib/requestAuth";
import { logger } from "@/lib/logger";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Daily (vercel.json). The privacy policy's retention rules:
// - rejected business applications not sent again within 90 days lose their
//   verification data, IBAN and registry extract;
// - the legal name and ID code of a deleted business go 6 years later.
// run_data_retention deletes the rows and returns the registry-extract files,
// which only the Storage API can remove.
export async function GET(request: Request) {
  if (!isBearerSecretAuthorized(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase.rpc("run_data_retention");

    if (error) {
      logger.error("Data retention failed", { error: error.message });
      return NextResponse.json({ ok: false, error: "Data retention failed." }, { status: 500 });
    }

    const paths = ((data || []) as { registry_extract_path: string | null }[])
      .map((row) => row.registry_extract_path)
      .filter((path): path is string => Boolean(path));

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from("business-documents").remove(paths);
      if (removeError) {
        logger.error("Expired registry extracts could not be removed", { error: removeError.message });
      }
    }

    return NextResponse.json({ ok: true, removedExtracts: paths.length });
  } catch (error) {
    logger.error("Data retention route failed", { error });
    return NextResponse.json({ ok: false, error: "Data retention failed." }, { status: 500 });
  }
}
