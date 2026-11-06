"use client";

import { getAppVersionLabel } from "@/lib/appLinks";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";

/**
 * The version line at the bottom of Settings. TEMPORARY: 5 taps reveal one
 * "Send test push" button (sends to this account's own devices, server
 * route, once a minute) for checking Android push. Remove the button once
 * Android is confirmed; keep the plain version line.
 */
export default function PushTestTap() {
  const [version, setVersion] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    void getAppVersionLabel().then(setVersion);
  }, []);

  function tap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((time) => now - time < 4000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      setOpen(true);
    }
  }

  async function send() {
    setBusy(true);
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/push/test", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { sent?: number; reason?: string } | null;
    setResult(
      response?.ok
        ? `Sent to ${body?.sent ?? 0} device(s)`
        : `Not sent (HTTP ${response?.status ?? "network"}${body?.reason ? `, ${body.reason}` : ""})`
    );
    setBusy(false);
  }

  return (
    <div className="pb-2 pt-4 text-center">
      <button
        type="button"
        onClick={tap}
        className="min-h-11 px-4 text-xs text-muted"
        aria-label={`Version ${version}`}
      >
        {version ? `v ${version}` : "v"}
      </button>
      {open && (
        <div className="mt-1 grid justify-items-center gap-1">
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className="min-h-11 rounded-xl bg-brand-forest px-4 text-xs font-semibold text-brand-ground disabled:opacity-60"
          >
            Send test push
          </button>
          {result && <p className="text-xs text-body">{result}</p>}
        </div>
      )}
    </div>
  );
}
