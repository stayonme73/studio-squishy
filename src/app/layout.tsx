import type { Metadata, Viewport } from "next";
import { Comic_Neue, Geist, Geist_Mono } from "next/font/google";

import { siteConfig } from "@/config/site";

import OwnerQaRoot from "@/components/dev/OwnerQaRoot";
import StudioPresenceRoot from "@/components/studio-presence/StudioPresenceRoot";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Squishy Lobby greeting only — rounded friendly face matching approved bubble reference. */
const comicNeue = Comic_Neue({
  variable: "--font-squishy-greeting",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${comicNeue.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col overflow-x-hidden">
        <StudioPresenceRoot>
          {children}
        </StudioPresenceRoot>
        <OwnerQaRoot />
      </body>
    </html>
  );
}
