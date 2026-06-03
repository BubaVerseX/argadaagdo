import type { Metadata, Viewport } from "next";
import "./globals.css";

const appDescription =
  "Reserve discounted leftover food boxes from local Tbilisi businesses and pick them up in store.";

export const metadata: Metadata = {
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
        url: "/icons/argadaagdo-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "ArGadaagdo",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "ArGadaagdo | Rescue Good Food in Tbilisi",
    description: appDescription,
    siteName: "ArGadaagdo",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
