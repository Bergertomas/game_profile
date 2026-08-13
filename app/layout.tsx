import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  IS_INDEXABLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  // Preview and local builds are kept out of the index at the page level as
  // well as in robots.txt, because robots.txt suppresses crawling, not
  // indexing. See lib/site.ts.
  robots: IS_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

/**
 * The chrome is graphite and the page is warm paper, so the browser furniture
 * should match the chrome rather than the body — the header is what sits under
 * the address bar. `colorScheme: light` because the product ground is light;
 * the graphite bands are structure, not a dark theme.
 */
export const viewport: Viewport = {
  themeColor: "#191b1f",
  colorScheme: "light",
};

/**
 * The html shell, and nothing that belongs to one surface.
 *
 * The public chrome — header, footer, skip link, site-wide structured data —
 * lives in `app/(public)/layout.tsx`, because it is part of the published
 * product rather than of every document this application serves. `/admin` is
 * the other surface and brings its own shell.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">{children}</body>
    </html>
  );
}
