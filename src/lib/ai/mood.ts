const ANGRY_ARABIC_TERMS = [
  "زعلان",
  "غاضب",
  "سيء",
  "وحش",
  "نصاب",
  "تعبت",
  "مش راضي",
  "مشكلة",
  "اشتكي",
  "فين",
  "حرام",
];

const ANGRY_ENGLISH_TERMS = ["angry", "bad", "terrible", "awful", "scam", "complain", "refund", "unacceptable", "where is"];

export function detectAngryTone(messageText: string) {
  const normalized = messageText.toLowerCase();

  return [...ANGRY_ARABIC_TERMS, ...ANGRY_ENGLISH_TERMS].some((term) => normalized.includes(term));
}
