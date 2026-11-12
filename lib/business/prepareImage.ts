import { allowedImageTypes, maxImageSizeBytes } from "@/lib/business/dashboard";

// Phone photos are often 5–15 MB, and iPhones save them as HEIC. Shop owners
// should never see a size or format error for a normal photo, so every photo
// is turned into a small JPG (PNG stays PNG, to keep logo transparency) in the
// browser before it is uploaded.

export const IMAGE_INPUT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
// Small, already-supported files go up untouched.
const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;

export const IMAGE_ERRORS = {
  type: "Invalid image type. Please use JPG, PNG, or WebP.",
  read: "This photo could not be opened. Please choose another photo or save it as JPG.",
  tooLarge: "Image is too large. Please upload a file under 5MB.",
} as const;

export type ImageUploadResult = { url: string; error?: undefined } | { url?: undefined; error: string };

export type PreparedImage = { file: File; error?: undefined } | { file?: undefined; error: string };

function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function looksLikeImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|hei[cf])$/i.test(file.name);
}

function baseName(name: string) {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  return withoutExtension || "photo";
}

async function heicToJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
  return Array.isArray(result) ? result[0] : result;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
}

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (!looksLikeImage(file)) return { error: IMAGE_ERRORS.type };

  if (!isHeic(file) && allowedImageTypes.includes(file.type) && file.size <= KEEP_AS_IS_BYTES) {
    return { file };
  }

  try {
    // Safari can show HEIC itself; other browsers need the converter.
    let source: Blob = file;
    let image: HTMLImageElement;
    try {
      image = await loadImage(source);
    } catch (error) {
      if (!isHeic(file)) throw error;
      source = await heicToJpeg(file);
      image = await loadImage(source);
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const keepPng = file.type === "image/png";
    const outputType = keepPng ? "image/png" : "image/jpeg";

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { error: IMAGE_ERRORS.read };
    if (!keepPng) {
      // JPG has no transparency: use white instead of black behind see-through parts.
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, outputType);
    if (!blob) return { error: IMAGE_ERRORS.read };
    if (blob.size > maxImageSizeBytes) return { error: IMAGE_ERRORS.tooLarge };

    const extension = keepPng ? "png" : "jpg";
    return { file: new File([blob], `${baseName(file.name)}.${extension}`, { type: outputType }) };
  } catch {
    return { error: IMAGE_ERRORS.read };
  }
}
