// FILE: src/lib/onboarding/emails.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: The first-user email sequence lives in one module so copy,
 * links, and subjects stay Arabic-only and consistent across triggers.
 */
import "server-only";

import { appEnv } from "@/lib/utils/env";

function appUrl(path: string) {
  return `${appEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;
}

function shell(title: string, greeting: string, body: string, cta: { href: string; label: string }) {
  return `<div dir="rtl" style="margin:0;background:#f7f8fb;padding:28px;font-family:Arial,'Tahoma',sans-serif;color:#111827">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden">
      <div style="padding:28px;border-bottom:1px solid #edf0f5">
        <p style="margin:0 0 8px;color:#2563eb;font-weight:700;letter-spacing:.08em">kallem | كَلّم</p>
        <h1 style="margin:0;font-size:24px;line-height:1.4">${title}</h1>
      </div>
      <div style="padding:24px 28px;line-height:1.9;color:#374151">
        <p style="margin:0 0 12px">أهلاً ${greeting}،</p>
        ${body}
        <p style="margin:24px 0 0;text-align:center">
          <a href="${cta.href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 26px;font-weight:700">${cta.label}</a>
        </p>
      </div>
    </div>
  </div>`;
}

function stepRow(n: string, title: string, text: string, href: string, linkLabel: string) {
  return `<div style="border:1px solid #edf0f5;border-radius:18px;padding:16px;margin:12px 0">
    <p style="margin:0;font-weight:700">${n} — ${title}</p>
    <p style="margin:8px 0;color:#6b7280">${text}</p>
    <a href="${href}" style="color:#2563eb;font-weight:700">${linkLabel}</a>
  </div>`;
}

export function buildWelcomeEmail(displayName: string) {
  const greeting = displayName || "صاحب النشاط";

  return {
    subject: "مرحباً في كَلّم! 👋 إليك خطواتك الأولى",
    html: shell(
      "حسابك جاهز — ٣ خطوات ويرد المساعد عنك",
      greeting,
      `<p style="margin:0 0 8px">خلّص الخطوات دي بالترتيب، وهتكون جاهز تستقبل رسائل العملاء في أقل من ٥ دقائق:</p>
      ${stepRow("١", "اربط واتساب", "اربط رقم نشاطك من صفحة القنوات حتى يستقبل kallem رسائل عملائك.", appUrl("/connect"), "افتح صفحة القنوات")}
      ${stepRow("٢", "عرّف المساعد بنشاطك", "اكتب وصف نشاطك والنبرة وساعات العمل حتى يرد المساعد بأسلوبك.", appUrl("/assistant"), "افتح صفحة المساعد")}
      ${stepRow("٣", "أضف معلوماتك ومنتجاتك", "أضف قائمة المعرفة ومنتجاتك وأسعارك حتى يجيب المساعد إجابات دقيقة.", appUrl("/knowledge"), "افتح قاعدة المعرفة")}`,
      { href: appUrl("/connect"), label: "ابدأ بالخطوة الأولى" },
    ),
  };
}

export function buildDayTwoNudgeEmail(displayName: string) {
  const greeting = displayName || "صاحب النشاط";

  return {
    subject: "هل تحتاج مساعدة في الربط؟",
    html: shell(
      "لسه ما وصلتش رسائل؟ خلينا نساعدك",
      greeting,
      `<p style="margin:0 0 8px">لاحظنا أن حسابك لسه ما استقبلش أي رسائل. غالباً خطوة الربط ناقصة، وهي أسهل مما تتخيل:</p>
      ${stepRow("١", "اربط رقم واتساب", "كل اللي تحتاجه بيانات من تطبيق Meta، والصفحة بتشرح كل خانة بالعربي.", appUrl("/connect"), "أكمل الربط الآن")}
      <p style="margin:12px 0 0">ولو وقفت في أي خطوة، ابعتلنا من صفحة الدعم وهنرد عليك بسرعة.</p>`,
      { href: appUrl("/support"), label: "اطلب المساعدة" },
    ),
  };
}

export function buildWeekOneSummaryEmail(params: {
  displayName: string;
  businessName: string;
  totalReplies: number;
  leadsDetected: number;
  topQuestion: string | null;
}) {
  const greeting = params.displayName || "صاحب النشاط";
  const fmt = (value: number) => value.toLocaleString("ar-EG");

  return {
    subject: "ملخص أسبوعك الأول على كَلّم 📊",
    html: shell(
      `أسبوعك الأول في ${params.businessName}`,
      greeting,
      `<p style="margin:0 0 8px">دي أهم أرقام أول ٧ أيام ليك على kallem:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">
        <div style="border:1px solid #edf0f5;border-radius:18px;padding:16px;text-align:center"><p style="margin:0;color:#6b7280;font-size:12px">ردود المساعد</p><strong style="display:block;margin-top:8px;font-size:24px">${fmt(params.totalReplies)}</strong></div>
        <div style="border:1px solid #edf0f5;border-radius:18px;padding:16px;text-align:center"><p style="margin:0;color:#6b7280;font-size:12px">عملاء محتملون</p><strong style="display:block;margin-top:8px;font-size:24px">${fmt(params.leadsDetected)}</strong></div>
      </div>
      <div style="border:1px solid #edf0f5;border-radius:18px;padding:16px;margin:12px 0">
        <p style="margin:0;font-weight:700">أبرز سؤال من عملائك</p>
        <p style="margin:8px 0 0;color:#6b7280">${params.topQuestion ?? "لسه مفيش أسئلة كافية — شارك رقمك مع عملائك وستظهر هنا."}</p>
      </div>
      <p style="margin:12px 0 0">نصيحة للأسبوع الجاي: زوّد قاعدة المعرفة بالأسعار وساعات العمل، وهتشوف الردود بتتحسن من أول يوم.</p>`,
      { href: appUrl("/dashboard"), label: "عرض لوحة التحكم" },
    ),
  };
}
