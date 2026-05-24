const BUYING_INTENT_PATTERNS = [
  /(?:كم|كام|السعر|سعر|بكام|تكلفة|التكلفة|عرض|اوردر|أطلب|اطلب|عايز|عاوز|محتاج|متوفر|متاح|حجز|احجز|اشتري|شراء|توصيل|دليفري)/i,
  /(?:how much|price|pricing|cost|order|buy|purchase|available|availability|book|booking|delivery|quote|need|want)/i,
];

const SOFT_INTENT_PATTERNS = [
  /(?:ممكن|ينفع|هل|فيه|عندكم|لو سمحت|تفاصيل|معلومات)/i,
  /(?:can i|do you|is there|details|info|information|please)/i,
];

export type LeadDetectionResult = {
  isLead: boolean;
  interest: string | null;
};

function normalizeMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function detectLeadIntent(messageText: string): LeadDetectionResult {
  const normalized = normalizeMessage(messageText);

  if (!normalized || normalized.length < 3) {
    return { isLead: false, interest: null };
  }

  const strongIntent = BUYING_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
  const softIntent = SOFT_INTENT_PATTERNS.some((pattern) => pattern.test(normalized)) && normalized.length >= 12;

  if (!strongIntent && !softIntent) {
    return { isLead: false, interest: null };
  }

  return {
    isLead: true,
    interest: normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized,
  };
}
