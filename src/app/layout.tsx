// FILE: src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
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
    default: "WA-AI Assistant",
    template: "%s | WA-AI Assistant",
  },
  description: "AI WhatsApp Business assistant SaaS.",
  openGraph: {
    title: "WA-AI Assistant",
    description: "AI WhatsApp Business assistant SaaS.",
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
