"use client";

import { CameraIcon } from "@/components/icons";
import type { CropState } from "@/lib/avatarCrop";
import { getNativeAppInfo } from "@/lib/native";
import { canPickAvatar, nameInitials } from "@/lib/profileFields";
import {
  decodeAvatarSource,
  exportAvatar,
  getAvatarUrl,
  NotAnImageError,
  removeMyAvatar,
  uploadMyAvatar,
} from "@/lib/profileIdentity";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import AvatarCropper from "./AvatarCropper";

/**
 * Whether the photo picker may be shown: always on the website and Android;
 * on iOS only from build 7, the first with camera / photo usage texts (older
 * builds crash on "Take Photo"). null while unknown.
 */
export function useCanPickAvatar() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void getNativeAppInfo().then((app) => active && setAllowed(canPickAvatar(app)));
    return () => {
      active = false;
    };
  }, []);
  return allowed;
}

type Props = {
  userId: string;
  name: string;
  /** undefined while the profile row is loading. */
  avatarPath: string | null | undefined;
  isGeorgian: boolean;
  size?: number;
  onChange?: (path: string | null) => void;
};

// The round profile photo (or initials). Only the signed-in person sees and
// changes their own photo: tap → choose → crop → save, or remove it.
export default function ProfileAvatar({
  userId,
  name,
  avatarPath,
  isGeorgian,
  size = 48,
  onChange,
}: Props) {
  const L = (ka: string, en: string) => (isGeorgian ? ka : en);
  const canPick = useCanPickAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cropError, setCropError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!avatarPath) return;
    let active = true;
    void getAvatarUrl(avatarPath).then((url) => {
      if (active && url) setSigned({ path: avatarPath, url });
    });
    return () => {
      active = false;
    };
  }, [avatarPath]);

  useEffect(
    () => () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const remoteUrl = avatarPath && signed?.path === avatarPath ? signed.url : null;
  const imageUrl = localUrl || remoteUrl;
  const showImage = Boolean(imageUrl && broken !== imageUrl);
  const hasPhoto = Boolean(avatarPath || localUrl);

  function choose() {
    setMenuOpen(false);
    inputRef.current?.click();
  }

  async function picked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setCropError("");
      setSource(await decodeAvatarSource(file));
    } catch (error) {
      setToast(
        error instanceof NotAnImageError
          ? L("აირჩიე ფოტო", "Choose a photo")
          : L("ფოტო ვერ გაიხსნა", "Couldn't open the photo")
      );
    }
  }

  async function save(crop: CropState, view: number) {
    if (!source || busy) return;
    setBusy(true);
    setCropError("");
    try {
      const blob = await exportAvatar(source, crop, view);
      const path = await uploadMyAvatar(userId, blob);
      setLocalUrl(URL.createObjectURL(blob));
      setSource(null);
      onChange?.(path);
    } catch {
      setCropError(L("ვერ შეინახა. სცადე ხელახლა.", "Couldn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await removeMyAvatar(userId);
      setLocalUrl(null);
      setSigned(null);
      setMenuOpen(false);
      onChange?.(null);
    } catch {
      setToast(L("ვერ წაიშალა. სცადე ხელახლა.", "Couldn't remove. Try again."));
    } finally {
      setBusy(false);
    }
  }

  // Sheets and the crop screen go to <body>: inside the app's dark profile
  // header the colour tokens are inverted.
  const overlay = (node: ReactNode) => createPortal(node, document.body);

  const circle = (
    <span
      className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-moss font-semibold text-mint"
      style={{ fontSize: Math.round(size * 0.34) }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a private signed or local blob URL
        <img
          src={imageUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(imageUrl)}
        />
      ) : (
        nameInitials(name)
      )}
    </span>
  );

  return (
    <>
      {canPick ? (
        <button
          type="button"
          onClick={() => (hasPhoto ? setMenuOpen(true) : choose())}
          aria-label={hasPhoto ? L("ფოტოს შეცვლა", "Change photo") : L("ფოტოს დამატება", "Add photo")}
          aria-haspopup={hasPhoto ? "dialog" : undefined}
          className="native-press relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-mint"
          style={{ width: size, height: size }}
        >
          {circle}
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-brand-ground bg-brand-forest text-brand-ground"
          >
            <CameraIcon className="h-2.5 w-2.5" strokeWidth={2.4} />
          </span>
        </button>
      ) : (
        <span
          role="img"
          aria-label={showImage ? L("პროფილის ფოტო", "Profile photo") : name}
          className="relative block shrink-0"
          style={{ width: size, height: size }}
        >
          {circle}
        </span>
      )}

      {canPick && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(event) => void picked(event)}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      {menuOpen &&
        overlay(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={L("პროფილის ფოტო", "Profile photo")}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 sm:items-center"
          onClick={() => !busy && setMenuOpen(false)}
        >
          <div
            className="native-sheet grid w-full max-w-sm gap-2 rounded-t-[28px] bg-[#fbf7ee] px-5 pb-[calc(1.25rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-5 sm:rounded-[28px] sm:pb-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={choose}
              disabled={busy}
              autoFocus
              className="native-press min-h-12 rounded-2xl bg-brand-forest text-[15px] font-semibold text-brand-ground disabled:opacity-60"
            >
              {L("ახალი ფოტო", "New photo")}
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="native-press min-h-12 rounded-2xl border border-line bg-card text-[15px] font-semibold text-danger disabled:opacity-60"
            >
              {busy ? L("იშლება...", "Removing...") : L("ფოტოს წაშლა", "Remove photo")}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              disabled={busy}
              className="min-h-11 text-[15px] font-medium text-body"
            >
              {L("გაუქმება", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {source &&
        overlay(
          <AvatarCropper
          source={source}
          isGeorgian={isGeorgian}
          busy={busy}
          error={cropError}
          onCancel={() => setSource(null)}
          onSave={(crop, view) => void save(crop, view)}
        />
      )}

      {toast &&
        overlay(
        <p
          role="status"
          className="native-fixed-bottom fixed inset-x-0 z-[95] mb-20 mx-auto w-max max-w-[90vw] rounded-full bg-brand-forest px-4 py-2 text-[13px] font-medium text-brand-ground"
        >
          {toast}
        </p>
      )}
    </>
  );
}
