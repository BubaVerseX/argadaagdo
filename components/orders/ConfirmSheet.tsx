"use client";

import { useEffect, useRef } from "react";

type ConfirmSheetProps = {
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** A bottom sheet asking "are you sure?" — in the page, not window.confirm. */
export function ConfirmSheet({
  title,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        onClick={(event) => event.stopPropagation()}
        className="native-sheet w-full max-w-md rounded-t-[28px] bg-[#fbf7ee] px-6 pb-[calc(1.5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-6 text-center text-cream sm:rounded-[28px]"
      >
        <h2 id="confirm-sheet-title" className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-danger-soft text-[15px] font-semibold text-danger disabled:opacity-60"
        >
          {busy ? "…" : confirmLabel}
        </button>
        <button
          ref={keepRef}
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-forest text-[15px] font-semibold text-brand-ground disabled:opacity-60"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
