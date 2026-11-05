import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The offer list moved into /discover. Query strings carry over, and offer
  // pages at /offers/[id] don't match this exact path.
  async redirects() {
    return [{ source: "/offers", destination: "/discover", permanent: true }];
  },
  images: supabaseHostname
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/offer-images/**",
          },
        ],
        formats: ["image/avif", "image/webp"],
      }
    : undefined,
};

export default nextConfig;
