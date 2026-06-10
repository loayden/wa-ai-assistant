import { describe, expect, it } from "vitest";

import { GET as getSecurityTxt } from "@/app/.well-known/security.txt/route";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { createPublicPageMetadata, noIndexMetadata, publicSeoRoutes } from "@/lib/marketing/seo";
import { BRAND_TAGLINE } from "@/lib/utils/brand";

describe("public SEO metadata", () => {
  it("keeps sitemap limited to public marketing and legal routes", () => {
    const urls = sitemap().map((item) => new URL(item.url).pathname);

    expect(urls).toEqual([...publicSeoRoutes]);
    expect(urls).toContain("/blog/meta-readiness-checklist");
    expect(urls).not.toContain("/dashboard");
    expect(urls).not.toContain("/admin");
    expect(urls).not.toContain("/api/health");
  });

  it("blocks crawlers from authenticated product surfaces", () => {
    const config = robots();
    const firstRule = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(firstRule.disallow).toContain("/admin");
    expect(firstRule.disallow).toContain("/api");
    expect(firstRule.disallow).toContain("/messages");
    expect(firstRule.allow).toContain("/blog");
    expect(config.sitemap).toContain("/sitemap.xml");
  });

  it("provides shared noindex metadata for auth and protected layouts", () => {
    expect(noIndexMetadata.robots.index).toBe(false);
    expect(noIndexMetadata.robots.follow).toBe(false);
    expect(noIndexMetadata.robots.googleBot.index).toBe(false);
    expect(noIndexMetadata.robots.googleBot.follow).toBe(false);
  });

  it("builds share-ready metadata for public conversion pages", () => {
    const metadata = createPublicPageMetadata({
      title: "أسعار kallem",
      description: "خطط kallem الواضحة للأعمال الصغيرة.",
      path: "/pricing",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/pricing");
    expect(metadata.openGraph?.url).toBe("http://localhost:3000/pricing");
    expect(metadata.openGraph?.siteName).toBe("kallem كَلّم");
    expect(metadata.openGraph?.locale).toBe("ar_EG");
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("exposes installable app manifest metadata", () => {
    const config = manifest();

    expect(config.short_name).toBe("Kallem");
    expect(config.start_url).toBe("http://localhost:3000/dashboard");
    expect(config.display).toBe("standalone");
    expect(config.theme_color).toBe("#1A56FF");
    expect(config.icons?.some((icon) => icon.src === "/icon.png" && icon.sizes === "512x512")).toBe(true);
  });

  it("keeps the shared brand tagline multi-channel", () => {
    expect(BRAND_TAGLINE).toContain("واتساب");
    expect(BRAND_TAGLINE).toContain("إنستجرام");
    expect(BRAND_TAGLINE).toContain("ماسنجر");
  });

  it("publishes llms.txt with public product context only", async () => {
    const response = getLlmsTxt();
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("WhatsApp, Instagram, and Facebook Messenger");
    expect(body).toContain("/pricing");
    expect(body).toContain("Authenticated dashboards");
    expect(body).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("publishes a security.txt contact and policy file", async () => {
    const response = getSecurityTxt();
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("/support");
    expect(body).toContain("/security");
    expect(body).toContain("/.well-known/security.txt");
    expect(body).toContain("Preferred-Languages: ar, en");
  });
});
