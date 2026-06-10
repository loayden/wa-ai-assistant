import type { MetadataRoute } from "next";

import { getAbsoluteUrl, publicSeoRoutes } from "@/lib/marketing/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicSeoRoutes.map((route) => ({
    url: getAbsoluteUrl(route),
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : route.startsWith("/blog") ? "monthly" : "weekly",
    priority: route === "/" ? 1 : route === "/pricing" ? 0.9 : route.startsWith("/blog") ? 0.75 : 0.8,
  }));
}
