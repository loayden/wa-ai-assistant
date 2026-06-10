import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";
import { noIndexMetadata } from "@/lib/marketing/seo";

const adminLinks = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/businesses", label: "العملاء" },
  { href: "/admin/revenue", label: "الإيرادات" },
  { href: "/admin/questions", label: "أسئلة السوق" },
  { href: "/admin/tickets", label: "الدعم" },
];

export const metadata: Metadata = noIndexMetadata;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login?next=/admin");
    }

    if (error instanceof ForbiddenError) {
      redirect("/dashboard");
    }

    throw error;
  }

  return (
    <div className="min-h-screen bg-wa-gray-50">
      <header className="sticky top-0 z-30 border-b border-wa-gray-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1180px] flex-col gap-3 px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <BrandLogo wordmarkSize="sm" />
          <nav className="flex gap-1 overflow-x-auto rounded-full border border-wa-gray-100 bg-wa-gray-50 p-1" aria-label="تنقل الإدارة">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-body-sm font-semibold text-wa-gray-600 transition hover:bg-white hover:text-wa-blue-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/dashboard" className="hidden text-body-sm font-semibold text-wa-blue-600 hover:underline lg:inline-flex">
            العودة للتطبيق
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-3 py-5 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
