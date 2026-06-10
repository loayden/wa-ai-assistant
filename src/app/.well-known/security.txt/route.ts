import { getAbsoluteUrl } from "@/lib/marketing/seo";
import { BRAND_LOCKUP } from "@/lib/utils/brand";

function getExpiryDate() {
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return expires.toISOString();
}

function buildSecurityTxt() {
  return `# ${BRAND_LOCKUP} security contact
Contact: ${getAbsoluteUrl("/support")}
Policy: ${getAbsoluteUrl("/security")}
Privacy: ${getAbsoluteUrl("/privacy")}
Preferred-Languages: ar, en
Canonical: ${getAbsoluteUrl("/.well-known/security.txt")}
Expires: ${getExpiryDate()}
`;
}

export function GET() {
  return new Response(buildSecurityTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
