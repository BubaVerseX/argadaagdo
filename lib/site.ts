export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://argadaagdo.ge";

export function absoluteSiteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteUrl).toString();
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Account, checkout and admin pages shouldn't appear in search results. */
  index?: boolean;
};

// Metadata objects merge shallowly, so a route that sets no openGraph/twitter
// inherits the root's — i.e. every page claimed to be the homepage when
// shared. Each page gets its own title, canonical URL and share preview.
export function buildPageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetadataInput) {
  const fullTitle = `${title} | ArGadaagdo`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: "ArGadaagdo",
      type: "website" as const,
    },
    twitter: {
      card: "summary" as const,
      title: fullTitle,
      description,
    },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}

export const appStoreUrl = "https://apps.apple.com/app/id6827484439";
