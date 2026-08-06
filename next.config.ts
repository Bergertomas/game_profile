import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Game pages are static-first: they are editorial documents that change only
  // when an evaluation is published. See docs/decisions/0002-data-access.md.
  typedRoutes: true,
};

export default nextConfig;
