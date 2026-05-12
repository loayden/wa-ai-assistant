// FILE: src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: BRAND_LOCKUP,
    template: `%s | ${BRAND_LOCKUP}`,
  },
  description: "AI WhatsApp assistant for your business.",
  openGraph: {
    title: BRAND_LOCKUP,
    description: "AI WhatsApp assistant for your business.",
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
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
