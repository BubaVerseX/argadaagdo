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
  // Font files never change under the same versioned folder (app/fonts.css).
  async headers() {
    return [
      {
        // Basic hardening for every response. The app is never meant to be
        // framed (the native apps load it top-level), so framing is refused,
        // which blocks clickjacking on the admin/business/staff pages.
        // A full script/style CSP needs hashes for the inline boot scripts in
        // app/layout.tsx and is a separate step.
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
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
