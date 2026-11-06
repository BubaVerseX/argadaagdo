"use client";

import { getAppVersionLabel } from "@/lib/appLinks";
import { enablePush, getPushDiagnostics, logPush } from "@/lib/push/client";
import { useEffect, useRef, useState } from "react";

type Diagnostics = Awaited<ReturnType<typeof getPushDiagnostics>>;

/**
 * The version line at the bottom of Settings. Tapping it 5 times opens a
 * hidden panel with push diagnostics (for support screenshots). English only
 * on purpose: it's for the developer, not for customers.
 */
export default function PushDebug() {
  const [version, setVersion] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Diagnostics | null>(null);
  const [busy, setBusy] = useState(false);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    void getAppVersionLabel().then(setVersion);
  }, []);

  async function refresh() {
    setData(await getPushDiagnostics());
  }

  function tap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((time) => now - time < 4000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      setOpen(true);
      void refresh();
    }
  }

  async function tryTurnOn() {
    setBusy(true);
    try {
      logPush(`debug panel result: ${await enablePush()}`);
    } catch (error) {
      logPush("debug panel threw", error);
    }
    await refresh();
    setBusy(false);
  }

  function clearLog() {
    try {
      window.localStorage.removeItem("argadaagdo-push-debug");
    } catch {
      // Debug only.
    }
    void refresh();
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
        <section
          aria-label="Push diagnostics"
          className="mt-2 rounded-[22px] bg-card p-4 text-left font-mono text-[11px] leading-5 text-cream"
        >
          {data ? (
            <>
              {data.lines.map(([label, value]) => (
                <p key={label} className="break-words">
                  <span className="text-muted">{label}: </span>
                  {value}
                </p>
              ))}
              <p className="mt-2 text-muted">Log:</p>
              {data.log.length ? (
                data.log.map((line, index) => (
                  <p key={`${index}-${line}`} className="break-words">
                    {line}
                  </p>
                ))
              ) : (
                <p>-</p>
              )}
            </>
          ) : (
            <p>Loading…</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 font-sans">
            <button
              type="button"
              onClick={() => void tryTurnOn()}
              disabled={busy}
              className="min-h-11 rounded-xl bg-brand-mint px-3 text-xs font-semibold text-brand-forest disabled:opacity-60"
            >
              {busy ? "Trying… (up to 15 s)" : "Try turning on"}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="min-h-11 rounded-xl border border-line px-3 text-xs font-semibold"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={clearLog}
              className="min-h-11 rounded-xl border border-line px-3 text-xs font-semibold"
            >
              Clear log
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-xl border border-line px-3 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
