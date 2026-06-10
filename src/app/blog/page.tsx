import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";

import { AppFooter } from "@/components/shared/AppFooter";
import { createPublicPageMetadata } from "@/lib/marketing/seo";
import { BRAND_NAME, BRAND_NAME_AR } from "@/lib/utils/brand";

export const metadata: Metadata = createPublicPageMetadata({
  title: "مدونة kallem",
  description: "دليل عملي للأعمال الصغيرة لإدارة رسائل واتساب وإنستجرام وماسنجر والردود الذكية بدون تعقيد.",
  path: "/blog",
});

const posts = [
  {
    title: "كيف تحول رسائل السوشيال إلى طلبات بدون فريق دعم كبير؟",
    excerpt: "خطوات عملية لتنظيم أسئلة السعر والتوصيل والمواعيد داخل صندوق واحد، ثم تحويل المحادثة إلى Lead أو طلب.",
    image: "https://images.pexels.com/photos/7709227/pexels-photo-7709227.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "فريق خدمة عملاء يتابع رسائل العملاء على لابتوب",
    href: "/blog/social-messages-to-orders",
    points: ["صندوق موحد", "تصنيف Leads", "تسليم للبشر"],
  },
  {
    title: "لماذا تفشل ردود Instagram أو Messenger أحيانًا؟",
    excerpt: "شرح مبسط لصلاحيات Meta، حالة الويب هوك، ربط Instagram بالصفحة، ولماذا لا تكفي كلمة متصل وحدها.",
    image: "https://images.pexels.com/photos/7709195/pexels-photo-7709195.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "مسؤولة دعم عملاء تستخدم سماعة ولابتوب",
    href: "/blog/meta-readiness-checklist",
    points: ["صلاحيات Meta", "Webhook", "App Review"],
  },
  {
    title: "أفضل طريقة لتدريب مساعد AI على نشاطك التجاري",
    excerpt: "ما الذي يجب إضافته إلى قاعدة المعرفة حتى لا يخترع المساعد أسعارًا أو سياسات أو مواعيد غير دقيقة.",
    image: "https://images.pexels.com/photos/10376233/pexels-photo-10376233.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "صاحب نشاط ينظم مستندات العمل على لابتوب",
    href: "/blog/train-ai-business-knowledge",
    points: ["المنتجات", "السياسات", "اختبار الردود"],
  },
];

export default function BlogPage() {
  return (
    <main className="app-glass-background min-h-screen text-wa-gray-900">
      <div className="pointer-events-none fixed inset-0 opacity-24 [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:72px_72px]" />
      <header className="relative px-2 py-2 sm:px-4">
        <nav className="glass-surface mx-auto flex max-w-[1160px] items-center justify-between gap-3 rounded-[24px] px-3 py-3 sm:px-5">
          <Link href="/" className="inline-flex items-baseline gap-2 text-xl font-semibold text-wa-gray-900" aria-label="kallem home">
            <span>{BRAND_NAME}</span>
            <span lang="ar" dir="rtl" className="text-wa-blue-600">
              {BRAND_NAME_AR}
            </span>
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-wa-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(26,86,255,0.18)] transition hover:bg-[#0E47E8]"
          >
            ابدأ مجانًا
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-[1160px] px-3 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-wa-blue-100 bg-wa-blue-50 px-3 py-2 text-xs font-semibold text-wa-blue-600">
              <BookOpen className="size-4" aria-hidden="true" />
              أدلة عملية للأعمال الصغيرة
            </div>
            <h1 className="mt-5 max-w-[780px] text-[38px] font-semibold leading-[1.08] text-wa-gray-900 sm:text-[64px] sm:leading-[1.04]">
              تعلم كيف تجعل واتساب وإنستجرام وماسنجر مصدر بيع ودعم واضح.
            </h1>
            <p className="mt-5 max-w-[720px] text-body leading-7 text-wa-gray-600 sm:text-xl sm:leading-8">
              محتوى قصير ومباشر عن ربط القنوات، تدريب المساعد، تقليل فشل الردود، وتحويل الرسائل اليومية إلى نتائج قابلة للقياس.
            </p>
          </div>
          <div className="rounded-[26px] border border-wa-gray-100 bg-wa-gray-50 p-4">
            {["بدون مصطلحات تقنية", "مناسب للسوق العربي", "خطوات قابلة للتنفيذ"].map((item) => (
              <div key={item} className="flex items-center gap-3 border-b border-wa-gray-100 py-3 last:border-b-0">
                <CheckCircle2 className="size-5 text-wa-blue-600" aria-hidden="true" />
                <span className="text-body-sm font-semibold text-wa-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.title} className="overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_18px_54px_rgba(13,20,33,0.055)]">
              <div className="relative h-56">
                <Image src={post.image} alt={post.alt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 370px" />
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="text-xl font-semibold leading-tight text-wa-gray-900">{post.title}</h2>
                <p className="mt-3 text-body-sm leading-6 text-wa-gray-600">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.points.map((point) => (
                    <span key={point} className="rounded-full border border-wa-gray-100 bg-wa-gray-50 px-3 py-1.5 text-xs font-semibold text-wa-gray-600">
                      {point}
                    </span>
                  ))}
                </div>
                <Link href={post.href} className="mt-5 inline-flex items-center gap-2 text-body-sm font-semibold text-wa-blue-600 hover:underline">
                  اقرأ الدليل
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
