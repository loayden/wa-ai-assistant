import type { MetadataRoute } from "next";

import { getAbsoluteUrl, getSiteUrl } from "@/lib/marketing/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/security",
          "/blog",
          "/features",
          "/compare",
          "/privacy",
          "/terms",
          "/data-deletion",
        ],
        disallow: [
          "/admin",
          "/api",
          "/billing",
          "/broadcasts",
          "/connect",
          "/corrections",
          "/dashboard",
          "/inbox",
          "/knowledge",
          "/leads",
          "/messages",
          "/orders",
          "/products",
          "/readiness",
          "/settings",
          "/support",
          "/templates",
          "/whatsapp",
        ],
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
