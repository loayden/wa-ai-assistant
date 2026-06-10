import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { AppFooter } from "@/components/shared/AppFooter";
import { LogoMark } from "@/components/shared/LogoMark";
import { createPublicPageMetadata } from "@/lib/marketing/seo";

const articles = {
  "social-messages-to-orders": {
    title: "كيف تحول رسائل السوشيال إلى طلبات بدون فريق دعم كبير؟",
    description: "خطوات عملية لتنظيم رسائل واتساب وإنستجرام وماسنجر وتحويل الأسئلة المتكررة إلى Leads وطلبات واضحة.",
    image: "https://images.pexels.com/photos/7709227/pexels-photo-7709227.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "فريق خدمة عملاء يتابع رسائل العملاء على لابتوب",
    sections: [
      {
        title: "ابدأ من صندوق واحد",
        body: "أكبر خطأ هو متابعة كل قناة وحدها. اجمع واتساب وإنستجرام وماسنجر في مكان واحد حتى ترى الرسالة، القناة، حالة الرد، وهل تحتاج تدخلًا بشريًا.",
      },
      {
        title: "حوّل السؤال المتكرر إلى بيانات",
        body: "أسئلة السعر والتوصيل والمواعيد ليست رسائل فقط. هي إشارات شراء. سجّلها كـ Leads أو طلبات، ثم تابعها بدل أن تختفي داخل المحادثات.",
      },
      {
        title: "اترك القرار الأخير لصاحب النشاط",
        body: "الذكاء يختصر الوقت، لكن صاحب النشاط يجب أن يستطيع إيقاف الردود أو استلام المحادثة فورًا عندما تكون الرسالة حساسة.",
      },
    ],
  },
  "meta-readiness-checklist": {
    title: "لماذا تفشل ردود Instagram أو Messenger أحيانًا؟",
    description: "شرح مبسط لأهم أسباب توقف ردود Meta وكيف يفصل kallem بين اتصال تجريبي وجاهزية إنتاج.",
    image: "https://images.pexels.com/photos/7709195/pexels-photo-7709195.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "مسؤولة دعم عملاء تستخدم سماعة ولابتوب",
    sections: [
      {
        title: "الاتصال لا يعني الإنتاج",
        body: "قد تظهر الصفحة أو حساب Instagram متصلًا، لكن الردود العامة تحتاج صلاحيات Meta صحيحة، webhook فعال، وحالة تطبيق مناسبة للعملاء الحقيقيين.",
      },
      {
        title: "Instagram يحتاج ربطًا صحيحًا بالصفحة",
        body: "حساب Instagram يجب أن يكون Professional ومربوطًا بصفحة Facebook الصحيحة. إذا لم يحدث ذلك، تصل الرسائل أو تفشل الردود بطريقة تبدو مربكة للمستخدم.",
      },
      {
        title: "اعرض سبب الفشل للمستخدم",
        body: "بدل رسالة عامة مثل failed request، يجب أن يرى صاحب النشاط سببًا قابلًا للتنفيذ: نقص صلاحية، webhook غير مشترك، token منتهي، أو مزود AI غير متاح.",
      },
    ],
  },
  "train-ai-business-knowledge": {
    title: "أفضل طريقة لتدريب مساعد AI على نشاطك التجاري",
    description: "ما يجب إضافته إلى قاعدة المعرفة حتى يرد المساعد بدقة ولا يخترع الأسعار أو السياسات.",
    image: "https://images.pexels.com/photos/10376233/pexels-photo-10376233.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "صاحب نشاط ينظم مستندات العمل على لابتوب",
    sections: [
      {
        title: "ابدأ بالمعلومات التي يسأل عنها العملاء",
        body: "أضف الأسعار، ساعات العمل، التوصيل، طرق الدفع، سياسات الاستبدال، وأهم المنتجات أو الخدمات. هذه هي المادة التي يحتاجها المساعد يوميًا.",
      },
      {
        title: "اختبر قبل التشغيل",
        body: "اكتب أسئلة حقيقية من العملاء داخل صفحة الاختبار. إذا كان الرد عامًا أو ناقصًا، أضف معلومة جديدة ثم أعد الاختبار.",
      },
      {
        title: "اجعل التصحيح جزءًا من العمل",
        body: "عندما يصحح صاحب النشاط ردًا، يجب أن تتحول الملاحظة إلى معرفة قابلة لإعادة الاستخدام، وليس مجرد تعديل عابر لمحادثة واحدة.",
      },
    ],
  },
} as const;

type ArticleSlug = keyof typeof articles;

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug as ArticleSlug];

  if (!article) {
    return {
      title: "مدونة kallem",
    };
  }

  return createPublicPageMetadata({
    title: article.title,
    description: article.description,
    path: `/blog/${slug}`,
    image: article.image,
  });
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug as ArticleSlug];

  if (!article) {
    notFound();
  }

  return (
    <main className="app-glass-background min-h-screen text-wa-gray-900">
      <div className="pointer-events-none fixed inset-0 opacity-24 [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:72px_72px]" />
      <header className="relative px-2 py-2 sm:px-4">
        <nav className="glass-surface mx-auto flex max-w-[980px] items-center justify-between gap-3 rounded-[24px] px-3 py-3 sm:px-5">
          <Link href="/" className="inline-flex items-center" aria-label="kallem home">
            <LogoMark size="lg" />
          </Link>
          <Link href="/blog" className="text-body-sm font-semibold text-wa-blue-600 hover:underline">
            المدونة
          </Link>
        </nav>
      </header>

      <article className="relative mx-auto max-w-[980px] px-3 py-10 sm:px-6 sm:py-16">
        <Link href="/blog" className="inline-flex items-center gap-2 text-body-sm font-semibold text-wa-blue-600 hover:underline">
          <ArrowLeft className="size-4 rotate-180" aria-hidden="true" />
          العودة للمدونة
        </Link>
        <h1 className="mt-6 max-w-[840px] text-[36px] font-semibold leading-tight text-wa-gray-900 sm:text-[58px] sm:leading-[1.08]">
          {article.title}
        </h1>
        <p className="mt-5 max-w-[760px] text-body leading-7 text-wa-gray-600 sm:text-xl sm:leading-8">{article.description}</p>
        <div className="relative mt-8 overflow-hidden rounded-[28px] border border-wa-gray-100">
          <Image src={article.image} alt={article.alt} width={1400} height={760} priority className="h-[360px] w-full object-cover sm:h-[480px]" />
        </div>

        <div className="mt-8 space-y-4">
          {article.sections.map((section) => (
            <section key={section.title} className="rounded-[24px] border border-wa-gray-100 bg-white p-5 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                <div>
                  <h2 className="text-2xl font-semibold text-wa-gray-900">{section.title}</h2>
                  <p className="mt-3 text-body leading-7 text-wa-gray-600">{section.body}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-[26px] border border-wa-blue-100 bg-wa-blue-50 p-5 sm:p-6">
          <h2 className="text-2xl font-semibold text-wa-gray-900">الخطوة التالية</h2>
          <p className="mt-3 text-body-sm leading-6 text-wa-gray-700">
            ابدأ بحساب مجاني، أضف معلومات نشاطك، ثم اختبر الردود قبل تشغيلها على القنوات الحقيقية.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-wa-blue-600 px-5 text-body-sm font-semibold text-white shadow-[0_18px_44px_rgba(26,86,255,0.22)] transition hover:bg-[#0E47E8]"
          >
            ابدأ مجانًا
          </Link>
        </div>
      </article>

      <AppFooter />
    </main>
  );
}
