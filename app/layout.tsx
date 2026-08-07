import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: {
    default: "Should I Play? — know the game before you play it",
    template: "%s | Should I Play?",
  },
  description:
    "Should I Play? breaks games down across eight fixed dimensions so you can tell what kind of experience one is before you buy it. No overall score.",
  metadataBase: new URL("https://shouldiplay.gg"),
  openGraph: {
    siteName: "Should I Play?",
    type: "website",
    title: "Should I Play? — know the game before you play it",
    description:
      "See what a game does well, where it compromises, and whether that experience matches what you want — without reducing it to one overall score.",
    url: "https://shouldiplay.gg",
  },
  twitter: {
    card: "summary_large_image",
    title: "Should I Play? — know the game before you play it",
    description:
      "See what a game does well, where it compromises, and whether that experience matches what you want.",
  },
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
