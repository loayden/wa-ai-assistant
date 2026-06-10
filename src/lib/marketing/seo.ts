import type { Metadata } from "next";

import { BRAND_LOCKUP } from "@/lib/utils/brand";

export const defaultSiteUrl = "https://kallem.vercel.app";
export const defaultOpenGraphImage = "/videos/kallem-promo-poster.png";

export const publicSeoRoutes = [
  "/",
  "/pricing",
  "/security",
  "/blog",
  "/blog/social-messages-to-orders",
  "/blog/meta-readiness-checklist",
  "/blog/train-ai-business-knowledge",
  "/features/whatsapp",
  "/features/instagram",
  "/features/ai",
  "/features/inbox",
  "/compare/respond-io",
  "/compare/respondio",
  "/compare/whatchimp",
  "/compare/whatschimp",
  "/instagram-messenger-ai",
  "/whatsapp-ai",
  "/privacy",
  "/terms",
  "/data-deletion",
] as const;

export type PublicSeoRoute = (typeof publicSeoRoutes)[number];

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!rawUrl) {
    return defaultSiteUrl;
  }

  try {
    return new URL(rawUrl).origin;
  } catch {
    return defaultSiteUrl;
  }
}

export function getAbsoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export function createPublicPageMetadata({
  description,
  path,
  title,
  image = defaultOpenGraphImage,
}: {
  title: string;
  description: string;
  path: PublicSeoRoute | `/${string}`;
  image?: string;
}): Metadata {
  const url = getAbsoluteUrl(path);
  const imageUrl = image.startsWith("http") ? image : getAbsoluteUrl(image);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND_LOCKUP,
      locale: "ar_EG",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${BRAND_LOCKUP} - AI messaging SaaS`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export const noIndexMetadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
} as const;
