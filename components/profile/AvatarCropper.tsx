"use client";

import {
  AVATAR_MAX_ZOOM,
  AVATAR_MIN_ZOOM,
  clampCrop,
  cropScale,
  initialCrop,
  zoomCrop,
  type CropState,
} from "@/lib/avatarCrop";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type Props = {
  source: HTMLCanvasElement;
  isGeorgian: boolean;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (crop: CropState, view: number) => void;
};

function viewSize() {
  if (typeof window === "undefined") return 300;
  return Math.max(200, Math.min(window.innerWidth - 32, 360));
}

// Full-screen round crop: drag to move, pinch / wheel / slider to zoom.
export default function AvatarCropper({ source, isGeorgian, busy, error, onCancel, onSave }: Props) {
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const [view] = useState(viewSize);
  const [crop, setCrop] = useState<CropState>(() => initialCrop(source, view));
  const cropRef = useRef(crop);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const saveRef = useRef<HTMLButtonElement>(null);

  function update(next: CropState) {
    cropRef.current = next;
    setCrop(next);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(view * ratio);
    canvas.height = Math.round(view * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, view, view);
    const scale = cropScale(source, view, crop.zoom);
    context.imageSmoothingQuality = "high";
    context.drawImage(source, crop.x, crop.y, source.width * scale, source.height * scale);
  }, [crop, source, view]);

  useEffect(() => {
    saveRef.current?.focus();
    const area = areaRef.current;
    // Non-passive, so the page behind doesn't scroll while zooming.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = area!.getBoundingClientRect();
      const current = cropRef.current;
      update(
        zoomCrop(
          current,
          source,
          view,
          current.zoom * Math.exp(-event.deltaY * 0.002),
          event.clientX - rect.left,
          event.clientY - rect.top
        )
      );
    };
    area?.addEventListener("wheel", onWheel, { passive: false });
    return () => area?.removeEventListener("wheel", onWheel);
  }, [source, view]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const map = pointers.current;
    const previous = map.get(event.pointerId);
    if (!previous) return;
    const current = cropRef.current;

    if (map.size === 1) {
      update(
        clampCrop(
          {
            ...current,
            x: current.x + event.clientX - previous.x,
            y: current.y + event.clientY - previous.y,
          },
          source,
          view
        )
      );
    } else if (map.size === 2) {
      const other = [...map.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        if (before > 0) {
          const rect = event.currentTarget.getBoundingClientRect();
          update(
            zoomCrop(
              current,
              source,
              view,
              current.zoom * (after / before),
              (event.clientX + other.x) / 2 - rect.left,
              (event.clientY + other.y) / 2 - rect.top
            )
          );
        }
      }
    }
    map.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  function keyMove(event: KeyboardEvent<HTMLDivElement>) {
    const step = 12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const current = cropRef.current;
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      update(clampCrop({ ...current, x: current.x + dx, y: current.y + dy }, source, view));
    } else if (event.key === "+" || event.key === "=") {
      update(zoomCrop(current, source, view, current.zoom * 1.1));
    } else if (event.key === "-") {
      update(zoomCrop(current, source, view, current.zoom / 1.1));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={L("ფოტოს მორგება", "Adjust photo")}
      className="fixed inset-0 z-[90] flex flex-col bg-[#101410] text-white"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+var(--safe-area-inset-top,env(safe-area-inset-top,0px)))]">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 px-2 text-[15px] font-medium text-white/85 disabled:opacity-50"
        >
          {L("გაუქმება", "Cancel")}
        </button>
        <button
          ref={saveRef}
          type="button"
          onClick={() => onSave(cropRef.current, view)}
          disabled={busy}
          className="min-h-11 rounded-full bg-brand-mint px-5 text-[15px] font-semibold text-brand-forest disabled:opacity-60"
        >
          {busy ? L("ინახება...", "Saving...") : L("შენახვა", "Save")}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <div
          ref={areaRef}
          role="img"
          tabIndex={0}
          aria-label={L(
            "ფოტო წრეში. გადაათრიე ან გაადიდე.",
            "Photo in the circle. Drag or zoom it."
          )}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onKeyDown={keyMove}
          className="relative cursor-grab touch-none select-none overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-mint active:cursor-grabbing"
          style={{ width: view, height: view }}
        >
          <canvas ref={canvasRef} className="block" style={{ width: view, height: view }} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90"
            style={{ boxShadow: "0 0 0 9999px rgba(16,20,16,0.62)" }}
          />
        </div>

        <input
          type="range"
          min={AVATAR_MIN_ZOOM}
          max={AVATAR_MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(event) =>
            update(zoomCrop(cropRef.current, source, view, Number(event.target.value)))
          }
          aria-label={L("გადიდება", "Zoom")}
          className="w-full max-w-[320px] accent-[var(--brand-mint)]"
        />

        {error && (
          <p role="alert" className="text-center text-sm font-medium text-[#ffb4a8]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
