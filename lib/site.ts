export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://argadaagdo-silk.vercel.app";

export function absoluteSiteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteUrl).toString();
}
