import type { Metadata, Viewport } from "next";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import NotificationCenter from "@/components/NotificationCenter";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { absoluteSiteUrl, siteUrl } from "@/lib/site";
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
        url: "/apple-icon",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "ArGadaagdo",
    // "default" (not "black-translucent"): our theme is light beige with
    // dark text, and black-translucent forces white status bar icons —
    // that would be a real legibility regression on this background, not
    // just a subtle color mismatch. "default" gives an opaque light bar
    // with correctly-contrasted black icons.
    statusBarStyle: "default",
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
  },
  openGraph: {
    title: "ArGadaagdo | Rescue Good Food in Tbilisi",
    description: appDescription,
    url: absoluteSiteUrl("/"),
    siteName: "ArGadaagdo",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ArGadaagdo | Rescue Good Food in Tbilisi",
    description: appDescription,
  },
};

export const viewport: Viewport = {
  themeColor: "#d9d5cb",
  colorScheme: "light",
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
