// Sharing from the app and the website.
//
// In the app, the native share sheet comes from @capacitor/share (images are
// first written to the cache with @capacitor/filesystem). Builds made before
// those plugins were added fall back to the Web Share API, and then to a
// preview the person can save (images) or the clipboard (links).

type SharePlugin = {
  share(options: { title?: string; text?: string; url?: string; files?: string[]; dialogTitle?: string }): Promise<unknown>;
};
type FilesystemPlugin = {
  writeFile(options: { path: string; data: string; directory: string }): Promise<{ uri: string }>;
};

function nativePlugins() {
  const capacitor = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { Share?: SharePlugin; Filesystem?: FilesystemPlugin };
    };
  }).Capacitor;
  return capacitor?.isNativePlatform?.() ? capacitor.Plugins || {} : {};
}

function wasCancelled(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /abort|cancel/i.test(text);
}

function toBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export type ShareResult = "shared" | "cancelled" | "copied" | "unsupported";

/** Shares a link; falls back to copying it. */
export async function shareLink(options: { title: string; text: string; url: string }): Promise<ShareResult> {
  const { Share } = nativePlugins();
  try {
    if (Share) {
      await Share.share({ ...options, dialogTitle: options.title });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share(options);
      return "shared";
    }
  } catch (error) {
    if (wasCancelled(error)) return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(`${options.text} ${options.url}`);
    return "copied";
  } catch {
    return "unsupported";
  }
}

/** Shares an image file (e.g. to Instagram Stories). "unsupported" = show a preview instead. */
export async function shareImage(
  blob: Blob,
  options: { fileName: string; title: string; text?: string }
): Promise<ShareResult> {
  const { Share, Filesystem } = nativePlugins();
  try {
    if (Share && Filesystem) {
      const { uri } = await Filesystem.writeFile({
        path: options.fileName,
        data: await toBase64(blob),
        directory: "CACHE",
      });
      await Share.share({ title: options.title, files: [uri], dialogTitle: options.title });
      return "shared";
    }
    const file = new File([blob], options.fileName, { type: blob.type || "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: options.title, text: options.text });
      return "shared";
    }
  } catch (error) {
    if (wasCancelled(error)) return "cancelled";
  }
  return "unsupported";
}
