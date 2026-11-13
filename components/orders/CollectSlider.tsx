"use client";

import { CheckIcon, ChevronRightIcon, XIcon } from "@/components/icons";
import type { Language } from "@/lib/i18n";
import { getGreenBagLabel } from "@/lib/offerCategories";
import type { Order } from "@/lib/types";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type CollectSliderProps = {
  order: Order;
  language: Language;
  /** Returns true when the order is now collected. */
  onCollect: () => Promise<boolean>;
  /** Returns true when the collection was undone. */
  onUndo: () => Promise<boolean>;
  onClose: () => void;
};

const UNDO_SECONDS = 120;
const KNOB_SIZE = 64;

function formatClock(date: Date, withSeconds: boolean) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  }).format(date);
}

// Full-screen "Collected" slider, swiped in front of staff. Swiping to the end
// calls collect_my_order; the confirmation shows the store, the box, a live
// clock and a 2-minute Undo. A keyboard/assistive fallback button does the
// same without dragging.
export function CollectSlider({ order, language, onCollect, onUndo, onClose }: CollectSliderProps) {
  const isGeorgian = language === "ka";
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"ready" | "collecting" | "done" | "undoing">("ready");
  const [now, setNow] = useState(() => new Date());
  const [collectedAt, setCollectedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const onCloseRef = useRef(onClose);
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // The knob travels the track's width minus its own size; measured here so
  // render never has to read the DOM.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setTrackWidth(entry.contentRect.width);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [phase]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const undoSecondsLeft = collectedAt
    ? Math.max(0, UNDO_SECONDS - Math.floor((now.getTime() - collectedAt.getTime()) / 1000))
    : 0;

  const maxTravel = Math.max(0, trackWidth - KNOB_SIZE - 8);

  function maxOffset() {
    return maxTravel;
  }

  async function complete() {
    if (phase !== "ready") return;
    setPhase("collecting");
    setError("");
    const ok = await onCollect();
    if (ok) {
      setCollectedAt(new Date());
      setPhase("done");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.([40, 60, 40]);
        } catch {}
      }
    } else {
      setPhase("ready");
      setOffset(0);
      setError(
        isGeorgian
          ? "ვერ დადასტურდა. სცადე თავიდან ან აჩვენე წაღების კოდი."
          : "Could not confirm. Try again or show your pickup code instead."
      );
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (phase !== "ready") return;
    pointerId.current = event.pointerId;
    startX.current = event.clientX - offset;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || pointerId.current !== event.pointerId) return;
    const next = Math.min(maxOffset(), Math.max(0, event.clientX - startX.current));
    setOffset(next);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (pointerId.current !== event.pointerId) return;
    setDragging(false);
    pointerId.current = null;
    if (offset >= maxOffset() * 0.88) {
      setOffset(maxOffset());
      void complete();
    } else {
      setOffset(0);
    }
  }

  async function undo() {
    if (phase !== "done" || undoSecondsLeft <= 0) return;
    setPhase("undoing");
    const ok = await onUndo();
    if (ok) {
      setCollectedAt(null);
      setOffset(0);
      setPhase("ready");
    } else {
      setPhase("done");
      setError(
        isGeorgian ? "გაუქმება ვერ მოხერხდა." : "The pickup could not be undone."
      );
    }
  }

  const progress = maxTravel > 0 ? offset / maxTravel : 0;
  const bagLabel = order.offers ? getGreenBagLabel(order.offers, language) : "";
  const businessName = order.offers?.businesses?.name || "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isGeorgian ? "წაღების დადასტურება" : "Confirm pickup"}
      className="fixed inset-0 z-[60] flex flex-col bg-page text-cream"
      style={{
        paddingTop: "max(16px, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-sm tracking-widest text-body" aria-live="off">
          {formatClock(now, true)}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={isGeorgian ? "დახურვა" : "Close"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-well text-cream"
        >
          <XIcon className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        {phase === "done" || phase === "undoing" ? (
          <div className="collect-pop text-center">
            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-mint text-page shadow-[0_0_0_18px_rgba(218,241,222,0.12)]">
              <CheckIcon className="collect-check h-20 w-20" strokeWidth={2.4} />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-mint">
              {isGeorgian ? "წაღებულია" : "Collected"}
            </p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight">{businessName}</h2>
            <p className="mt-2 text-lg text-body">{bagLabel}</p>
            <p className="mt-1 text-base text-body">{order.offers?.title}</p>
            <p className="mt-6 font-mono text-5xl font-semibold tabular-nums text-cream">
              {formatClock(now, true)}
            </p>
            <p className="mt-2 text-sm text-body">
              {isGeorgian ? "დადასტურდა" : "Confirmed at"}{" "}
              {collectedAt ? formatClock(collectedAt, false) : ""} · #{order.id}
            </p>
            <p className="mt-4 text-sm text-body">
              {isGeorgian
                ? "აჩვენე ეს ეკრანი თანამშრომელს. ბიზნესის პანელში ჯავშანი უკვე წაღებულად ჩანს."
                : "Show this screen to the staff. The business dashboard already shows this order as collected."}
            </p>
            {error && (
              <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="mt-8 grid gap-3">
              {undoSecondsLeft > 0 ? (
                <button
                  type="button"
                  onClick={() => void undo()}
                  disabled={phase === "undoing"}
                  className="premium-button-secondary min-h-12 w-full py-3 disabled:opacity-60"
                >
                  {phase === "undoing"
                    ? isGeorgian
                      ? "უქმდება..."
                      : "Undoing..."
                    : isGeorgian
                    ? `შეცდომით? გაუქმება (${undoSecondsLeft} წმ)`
                    : `Mistake? Undo (${undoSecondsLeft}s)`}
                </button>
              ) : (
                <p className="text-xs text-muted">
                  {isGeorgian ? "გაუქმების დრო ამოიწურა." : "The undo window has closed."}
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="premium-button cta-glow min-h-12 w-full py-3"
              >
                {isGeorgian ? "მზადაა" : "Done"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mint">
                {isGeorgian ? "წაღება" : "Pickup"}
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{businessName}</h2>
              <p className="mt-2 text-lg text-body">{bagLabel}</p>
              <p className="mt-1 text-base text-body">{order.offers?.title}</p>
              <p className="mt-6 font-mono text-5xl font-semibold tabular-nums text-cream">
                {formatClock(now, false)}
              </p>
              <p className="mt-5 rounded-2xl bg-brand-honey px-4 py-3 text-base font-bold text-brand-ink">
                {isGeorgian
                  ? "გადაასრიალე მხოლოდ თანამშრომლის თვალწინ"
                  : "Swipe only in front of the staff"}
              </p>
              <p className="mt-3 text-sm leading-6 text-body">
                {isGeorgian
                  ? "სხვაგან გადასრიალება წაღებულად ითვლება. შეცდომისას 2 წუთში გაუქმება შეგიძლია."
                  : "A swipe anywhere else counts as collected. If it was a mistake, you can undo for 2 minutes."}
              </p>
            </div>

            <div
              ref={trackRef}
              className="relative h-[72px] select-none overflow-hidden rounded-full bg-well"
              style={{ touchAction: "none" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-mint/25"
                style={{ width: `${Math.max(KNOB_SIZE + 8, offset + KNOB_SIZE + 8)}px` }}
                aria-hidden="true"
              />
              <p
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-base font-semibold text-cream transition-opacity"
                style={{ opacity: 1 - progress * 1.4 }}
                aria-hidden="true"
              >
                {phase === "collecting"
                  ? isGeorgian
                    ? "დასტურდება..."
                    : "Confirming..."
                  : isGeorgian
                  ? "გადაასრიალე წაღებისთვის →"
                  : "Slide to collect →"}
              </p>
              <button
                type="button"
                aria-label={isGeorgian ? "გადაასრიალე წაღების დასადასტურებლად" : "Slide to confirm pickup"}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOffset(maxOffset());
                    void complete();
                  }
                }}
                disabled={phase !== "ready"}
                className="absolute top-1 flex h-16 w-16 items-center justify-center rounded-full bg-mint text-page shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cream disabled:opacity-80"
                style={{
                  left: 4,
                  transform: `translateX(${offset}px)`,
                  transition: dragging ? "none" : "transform 180ms ease-out",
                }}
              >
                <ChevronRightIcon className="h-7 w-7" strokeWidth={2.2} />
              </button>
            </div>

            {error && (
              <p className="rounded-2xl bg-danger-soft px-4 py-3 text-center text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <p className="text-center text-xs text-muted">
              {isGeorgian ? "სარეზერვო კოდი" : "Backup code"}:{" "}
              <span className="font-mono tracking-[0.2em] text-body">{order.pickup_code || "—"}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
