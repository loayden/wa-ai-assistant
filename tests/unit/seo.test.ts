import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { noIndexMetadata, publicSeoRoutes } from "@/lib/marketing/seo";

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
});
