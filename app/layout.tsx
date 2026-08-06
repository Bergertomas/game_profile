import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: {
    default: "Game Profile — what kind of good is it?",
    template: "%s — Game Profile",
  },
  description:
    "Game Profile describes games across eight fixed dimensions so you can tell what kind of experience one is before you buy it. No overall score.",
  metadataBase: new URL("https://gameprofile.example"),
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-brass focus:bg-ink-900 focus:px-3 focus:py-2 focus:text-sm focus:text-bone"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
