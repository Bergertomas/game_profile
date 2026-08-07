import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://shouldiplay.gg/sitemap.xml",
    host: "https://shouldiplay.gg",
  };
}
