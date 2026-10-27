import type { Metadata, Viewport } from "next";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import NotificationCenter from "@/components/NotificationCenter";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { siteUrl } from "@/lib/site";
// Self-hosted brand fonts: Noto Sans (Latin) + Noto Sans Georgian, weights
// 400/500/600 only — headings are 600, body 400.
import "@fontsource/noto-sans/latin-400.css";
import "@fontsource/noto-sans/latin-500.css";
import "@fontsource/noto-sans/latin-600.css";
import "@fontsource/noto-sans-georgian/georgian-400.css";
import "@fontsource/noto-sans-georgian/georgian-500.css";
import "@fontsource/noto-sans-georgian/georgian-600.css";
import "./globals.css";

const appDescription =
  "Save money on surprise food bags from verified local Tbilisi businesses. Reserve online, pick up in person, and help reduce food waste.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ArGadaagdo | Rescue Good Food in Tbilisi",
    template: "%s | ArGadaagdo",
  },
  description: appDescription,
  applicationName: "ArGadaagdo",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/icons/argadaagdo-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "ArGadaagdo",
    // Dark green theme: "black-translucent" draws the page under the status
    // bar with white icons; globals.css pads the body by the safe-area inset
    // and paints an opaque strip behind the bar, so nothing scrolls under
    // the clock.
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // Next's `appleWebApp.capable` only emits the generic
    // `mobile-web-app-capable` tag. Older/some iOS versions specifically
    // look for this apple-prefixed one to enable proper standalone mode
    // (hides Safari chrome) — without it, "Add to Home Screen" can silently
    // fall back to opening inside Safari instead of full-screen.
    "apple-mobile-web-app-capable": "yes",

    // Talent Protocol verification
    "talentapp:project_verification":
      "cb3b653b92cfc9e35bf68e3b8430bc1606628d56462d120b76e4e5f33d6fbddf50ed31c35c852219c7dbb6e3f9509866519a33bc798635634e00a62dd4601b38",
  },
  // No `url` here: routes without their own openGraph inherit this object,
  // and a root url made every such page claim to be the homepage when shared.
  openGraph: {
    title: "ArGadaagdo | Rescue Good Food in Tbilisi",
    description: appDescription,
    siteName: "ArGadaagdo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArGadaagdo | Rescue Good Food in Tbilisi",
    description: appDescription,
  },
};

export const viewport: Viewport = {
  themeColor: "#051f20",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <NotificationCenter />
        <ServiceWorkerRegistration />
        <InstallAppPrompt />
      </body>
    </html>
  );
}
