const FALLBACK_ERROR_MESSAGE = "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.";

const ERROR_TRANSLATIONS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "البريد الإلكتروني أو كلمة المرور غير صحيحة."],
  [/account with this email already exists/i, "يوجد حساب بهذا البريد بالفعل. سجّل الدخول بدلاً من إنشاء حساب جديد."],
  [/validation failed/i, "يرجى مراجعة البيانات المطلوبة ثم المحاولة مرة أخرى."],
  [/database temporarily unavailable|can't reach database|connection terminated|connection refused/i, "الخدمة غير متاحة مؤقتاً. حاول مرة أخرى بعد قليل."],
  [/too many requests|rate limit/i, "طلبات كثيرة في وقت قصير. انتظر قليلاً ثم حاول مرة أخرى."],
  [/openai|api key|quota|billing|model|provider/i, "المساعد غير متاح الآن. حاول مرة أخرى بعد قليل أو تواصل مع الدعم."],
  [/paymob|payment setup|checkout/i, "الدفع غير متاح الآن. سنفعله بعد اكتمال إعداد مزود الدفع."],
  [/meta signup was cancelled|meta sign-in was cancelled/i, "تم إلغاء نافذة Meta قبل اكتمال الربط."],
  [/meta connected successfully/i, "تم تسجيل الدخول إلى Meta، لكن لم يكتمل حفظ الربط داخل kallem."],
  [/not allowed for this endpoint/i, "هذا الإجراء غير متاح من هذه الشاشة."],
  [/already on this plan/i, "هذه الخطة مفعلة بالفعل."],
];

export function translateError(value: unknown, fallback = FALLBACK_ERROR_MESSAGE): string {
  const message = value instanceof Error ? value.message : typeof value === "string" ? value : fallback;
  const normalized = message.trim();

  if (!normalized) {
    return fallback;
  }

  const match = ERROR_TRANSLATIONS.find(([pattern]) => pattern.test(normalized));

  if (match) {
    return match[1];
  }

  if (/[\u0600-\u06FF]/.test(normalized)) {
    return normalized;
  }

  return fallback;
}
