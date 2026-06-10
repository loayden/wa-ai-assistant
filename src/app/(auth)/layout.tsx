/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Auth routes now sit inside a longer two-panel shell so login and
 * signup inherit more product context and visual depth without changing the
 * form behavior itself.
 */
import type { Metadata } from "next";
import Image from "next/image";
import { Bot, CheckCircle2, MailCheck, RadioTower, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { AppFooter } from "@/components/shared/AppFooter";
import { noIndexMetadata } from "@/lib/marketing/seo";

const authImage =
  "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=1600";

const setupSteps = [
  {
    title: "إنشاء الحساب",
    body: "استخدمي بريد النشاط التجاري حتى تبقى الفوترة والإعدادات في مكان واحد.",
    icon: UserRound,
  },
  {
    title: "تأكيد البريد",
    body: "افتحي رابط التأكيد، وبعدها يفتح kallem مركز ربط القنوات تلقائياً.",
    icon: MailCheck,
  },
  {
    title: "ربط القنوات",
    body: "ابدئي بواتساب أو Meta، ثم أضيفي إنستجرام وماسنجر من نفس المكان.",
    icon: RadioTower,
  },
  {
    title: "تشغيل الردود",
    body: "فعّلي المساعد، راجعي الرسائل، وأوقفي الردود في أي وقت.",
    icon: Bot,
  },
];

const authPoints = [
  "ربط واتساب وإنستجرام وماسنجر من مركز واحد واضح.",
  "الذكاء يرد على رسائل القنوات المتصلة مع بقاء المالك متحكماً بالكامل.",
  "مراجعة كل محادثات العملاء من صندوق رسائل هادئ بدلاً من لوحات متفرقة.",
];

export const metadata: Metadata = noIndexMetadata;

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="app-glass-background min-h-screen text-wa-gray-900">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.56)_42%,rgba(255,255,255,0.18)_100%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-[1320px] gap-5 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[0.98fr_0.82fr] lg:px-6 lg:py-8">
        <section className="glass-surface order-2 flex flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] lg:order-1">
          <div className="relative min-h-[220px] w-full border-b border-wa-gray-100 sm:min-h-[340px]">
            <Image
              src={authImage}
              alt="فريق صغير يدير رسائل العملاء من جهاز لابتوب"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 56vw"
            />
            <div className="glass-panel absolute inset-x-3 bottom-3 rounded-[20px] p-4 sm:inset-x-5 sm:bottom-5 sm:rounded-[24px] sm:p-5">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">إعداد جاهز للعمل</p>
              <p className="mt-2 max-w-[620px] text-body font-medium text-wa-gray-900">طريقة واضحة لربط واتساب وإنستجرام وماسنجر، تشغيل ردود الذكاء، ومتابعة العملاء بدون تعقيد.</p>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:gap-8 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="lg:pr-3">
              <p className="text-label font-semibold tracking-widest text-wa-blue-600">لماذا تختار الأنشطة kallem</p>
              <h1 className="mt-3 text-[28px] font-semibold leading-tight text-wa-gray-900 sm:text-[42px] sm:leading-[1.08]">لوحة هادئة لإدارة محادثات العملاء اليومية.</h1>
              <p className="mt-3 text-body-sm leading-6 text-wa-gray-600 sm:mt-4 sm:text-body-lg">
                استخدمي هذا الحساب لربط قنوات النشاط، ضبط أسلوب الرد، ومتابعة الرسائل والفوترة من مكان واحد.
              </p>

              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
                {authPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3.5 sm:p-4">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                    <p className="text-body text-wa-gray-700">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[22px] p-4 sm:rounded-[28px] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">مسار الإعداد</p>
                  <h2 className="mt-2 text-xl font-semibold text-wa-gray-900 sm:text-2xl">من التسجيل إلى الردود الحية</h2>
                </div>
                <span className="rounded-full bg-wa-blue-50 px-3 py-1.5 text-xs font-semibold text-wa-blue-600">٤ خطوات</span>
              </div>
              <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                {setupSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div key={step.title} className="grid grid-cols-[38px_1fr] gap-3 sm:grid-cols-[44px_1fr] sm:gap-4">
                      <div className="relative">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-wa-blue-600 text-white shadow-[0_14px_34px_rgba(26,86,255,0.18)] sm:size-11 sm:rounded-2xl">
                          <Icon className="size-4 sm:size-5" aria-hidden="true" />
                        </div>
                        {index < setupSteps.length - 1 ? <span className="absolute left-1/2 top-10 h-7 w-px -translate-x-1/2 bg-wa-blue-100 sm:top-12 sm:h-8" /> : null}
                      </div>
                      <div className="pb-2">
                        <p className="text-body font-semibold text-wa-gray-900">{step.title}</p>
                        <p className="mt-1 text-body-sm leading-6 text-wa-gray-600">{step.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="glass-control rounded-2xl p-4">
                  <ShieldCheck className="size-5 text-wa-blue-600" aria-hidden="true" />
                  <p className="mt-3 text-body-sm font-semibold text-wa-gray-900">تخزين آمن</p>
                  <p className="mt-1 text-body-sm text-wa-gray-600">بيانات الربط تُحفظ بعد التحقق منها وتبقى محمية.</p>
                </div>
                <div className="glass-control rounded-2xl p-4">
                  <Sparkles className="size-5 text-wa-blue-600" aria-hidden="true" />
                  <p className="mt-3 text-body-sm font-semibold text-wa-gray-900">تحكم يومي</p>
                  <p className="mt-1 text-body-sm text-wa-gray-600">افتحي الرئيسية والرسائل والإعدادات والفوترة من نفس الحساب.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center justify-center py-2 lg:order-2 lg:py-0">
          {children}
        </section>
      </div>
      <div className="relative">
        <AppFooter compact />
      </div>
    </main>
  );
}
