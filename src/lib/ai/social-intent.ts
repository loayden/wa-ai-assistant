export type SocialIntent =
  | "order"
  | "price_inquiry"
  | "complaint"
  | "collaboration"
  | "influencer_request"
  | "spam"
  | "support"
  | "other";

const INTENT_PATTERNS: Array<{ intent: SocialIntent; patterns: RegExp[] }> = [
  {
    intent: "spam",
    patterns: [
      /\b(crypto|forex|bitcoin|airdrop|giveaway|winner|prize|click\s+now|free\s+followers)\b/i,
      /https?:\/\/\S+/i,
      /(كسب|اربح|جائزة|رابط|متابعين مجاني|استثمار مضمون)/i,
    ],
  },
  {
    intent: "complaint",
    patterns: [
      /\b(complaint|bad|terrible|awful|angry|refund|scam|broken|problem)\b/i,
      /(شكوى|سيء|وحش|زفت|مشكلة|نصب|غاضب|مش عاجب|عايز ارجع|استرجاع)/i,
    ],
  },
  {
    intent: "collaboration",
    patterns: [
      /\b(collab|collaborate|collaboration|partnership|sponsor|sponsorship|brand deal|advertise|advertising)\b/i,
      /(تعاون|شراكة|اعلان|إعلان|رعاية|نعلن|اعلن|براند)/i,
    ],
  },
  {
    intent: "influencer_request",
    patterns: [
      /\b(influencer|creator|blogger|media kit|followers|ambassador)\b/i,
      /(انفلونسر|بلوجر|صانع محتوى|فولورز|متابعين|سفير)/i,
    ],
  },
  {
    intent: "order",
    patterns: [
      /\b(order|buy|want|take|need|checkout|deliver|delivery)\b/i,
      /(عايز|عايزة|اطلب|طلب|اشتري|اخد|هات|وصل|توصيل)/i,
    ],
  },
  {
    intent: "price_inquiry",
    patterns: [
      /\b(price|how much|cost|available|availability|in stock)\b/i,
      /(بكام|كام|السعر|سعر|متوفر|متاحة|موجود)/i,
    ],
  },
  {
    intent: "support",
    patterns: [
      /\b(help|support|issue|question|how can|can't|cannot)\b/i,
      /(مساعدة|ساعدني|ازاي|كيف|مش عارف|مش فاهم|دعم)/i,
    ],
  },
];

export async function detectSocialIntent(text: string): Promise<SocialIntent> {
  const normalized = text.trim();

  if (!normalized) {
    return "other";
  }

  for (const candidate of INTENT_PATTERNS) {
    if (candidate.patterns.some((pattern) => pattern.test(normalized))) {
      return candidate.intent;
    }
  }

  return "other";
}
