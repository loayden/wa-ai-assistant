// FILE: src/app/layout.tsx
import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
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
  title: {
    default: BRAND_LOCKUP,
    template: `%s | ${BRAND_LOCKUP}`,
  },
  description: "مساعد واتساب ذكي يرد على العملاء، ينظم المحادثات، ويقيس أداء خدمة العملاء.",
  openGraph: {
    title: BRAND_LOCKUP,
    description: "مساعد واتساب ذكي للأعمال الصغيرة في مصر والعالم العربي.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
