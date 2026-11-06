"use client";

import { cropSourceRect, type CropState } from "@/lib/avatarCrop";
import { cleanName } from "@/lib/profileFields";
import { supabase } from "@/lib/supabase";

// The person's own name and photo (public.profiles display_name,
// display_name_changed_at, avatar_path). Names change only through
// set_my_display_name(); the photo lives in the private "avatars" bucket at
// <uid>/avatar.jpg. See supabase/migrations/20261107090000_profile_name_avatar.sql.

export type MyIdentity = {
  displayName: string;
  displayNameChangedAt: string | null;
  avatarPath: string | null;
};

export async function loadMyIdentity(userId: string): Promise<MyIdentity | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, display_name_changed_at, avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    display_name: string | null;
    display_name_changed_at: string | null;
    avatar_path: string | null;
  };
  return {
    displayName: row.display_name || "",
    displayNameChangedAt: row.display_name_changed_at,
    avatarPath: row.avatar_path,
  };
}

export type SaveNameResult = {
  status: "ok" | "unchanged" | "too_soon" | "too_long" | "invalid" | "error";
  displayName: string | null;
  nextChangeAt: string | null;
};

export async function saveMyDisplayName(name: string): Promise<SaveNameResult> {
  const { data, error } = await supabase.rpc("set_my_display_name", {
    p_name: cleanName(name),
  });
  const result = (data || {}) as {
    status?: string;
    display_name?: string | null;
    next_change_at?: string | null;
  };
  const known = ["ok", "unchanged", "too_soon", "too_long", "invalid"];

  if (error || !result.status || !known.includes(result.status)) {
    return { status: "error", displayName: null, nextChangeAt: null };
  }
  return {
    status: result.status as SaveNameResult["status"],
    displayName: result.display_name ?? null,
    nextChangeAt: result.next_change_at ?? null,
  };
}

// ---- Photo ----------------------------------------------------------------

const BUCKET = "avatars";
export const AVATAR_SIZE = 512;
// The bucket refuses files over 2 MB. Only the stored result has to fit:
// the chosen photo can be any size, because it is decoded and re-encoded
// here as a 512×512 JPEG (usually 30-120 KB).
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
// Big phone photos are scaled down once on open so cropping stays smooth and
// stays under iOS Safari's canvas memory limit.
const SOURCE_MAX_SIDE = 2048;

export function avatarPathFor(userId: string) {
  return `${userId}/avatar.jpg`;
}

export class NotAnImageError extends Error {}

function loadImageElement(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new NotAnImageError("decode"));
    };
    image.src = url;
  });
}

/**
 * Decodes the chosen file upright (EXIF orientation applied) into a canvas
 * no bigger than 2048 px on its long side. Throws NotAnImageError for
 * anything that isn't a photo.
 */
export async function decodeAvatarSource(file: File): Promise<HTMLCanvasElement> {
  if (file.type && !file.type.startsWith("image/")) throw new NotAnImageError(file.type);

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older WebKit: <img> applies EXIF orientation by default.
    source = await loadImageElement(file);
  }

  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new NotAnImageError("empty");

  const ratio = Math.min(1, SOURCE_MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}

/** The cropped circle area as a 512×512 JPEG, at most 2 MB. */
export async function exportAvatar(
  source: HTMLCanvasElement,
  crop: CropState,
  view: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");

  // JPEG has no transparency: fill first so a PNG with alpha isn't black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = "high";
  const { sx, sy, size } = cropSourceRect(crop, source, view);
  context.drawImage(source, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await canvasToJpeg(canvas, quality);
    if (blob && blob.size <= AVATAR_MAX_BYTES) return blob;
  }
  throw new Error("too_big");
}

export async function uploadMyAvatar(userId: string, blob: Blob) {
  const path = avatarPathFor(userId);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "60" });
  if (uploadError) throw uploadError;

  const { error } = await supabase.rpc("set_my_avatar", { p_path: path });
  if (error) throw error;
  return path;
}

export async function removeMyAvatar(userId: string) {
  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([avatarPathFor(userId)]);
  if (removeError) throw removeError;

  const { error } = await supabase.rpc("set_my_avatar", { p_path: null });
  if (error) throw error;
}

/**
 * A one-hour link to the private photo. Each call signs a new token, so the
 * URL changes whenever the photo is re-read and the old image isn't reused
 * from cache after a replace.
 */
export async function getAvatarUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return error ? null : data?.signedUrl || null;
}
