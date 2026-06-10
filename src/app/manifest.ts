import type { MetadataRoute } from "next";

import { getAbsoluteUrl } from "@/lib/marketing/seo";
import { BRAND_LOCKUP } from "@/lib/utils/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_LOCKUP,
    short_name: "Kallem",
    description: "منصة عربية لإدارة رسائل واتساب وإنستجرام وماسنجر والردود الذكية للأعمال الصغيرة.",
    start_url: getAbsoluteUrl("/dashboard"),
    scope: getAbsoluteUrl("/"),
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#1A56FF",
    dir: "rtl",
    lang: "ar",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
