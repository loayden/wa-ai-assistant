// FILE: src/app/layout.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cairo, Inter } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import { getSiteUrl } from "@/lib/marketing/seo";
import { BRAND_LOCKUP } from "@/lib/utils/brand";
import "./globals.css";

/*
 * [ROLE: ARCHITECT]
 * Decision: Inter is loaded through `next/font/google` because it is supported
 * by Next.js 14 and keeps Phase 1 buildable.
 */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: BRAND_LOCKUP,
    template: `%s | ${BRAND_LOCKUP}`,
  },
  description: "منصة رسائل سوشيال موحدة ترد على عملاء واتساب وإنستجرام وماسنجر، وتنظم المحادثات والطلبات والتحليلات.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: BRAND_LOCKUP,
    description: "منصة عربية لإدارة رسائل السوشيال والردود الذكية للأعمال الصغيرة في مصر والعالم العربي.",
    url: "/",
    siteName: BRAND_LOCKUP,
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: BRAND_LOCKUP,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: BRAND_LOCKUP,
    description: "منصة عربية لإدارة رسائل واتساب وإنستجرام وماسنجر والردود الذكية.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" data-csp-nonce={nonce} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
