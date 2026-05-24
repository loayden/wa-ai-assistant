export function parseCsatRating(messageText: string) {
  const digit = messageText.trim().match(/^([1-5])(?:\D|$)/)?.[1];

  if (!digit) {
    return null;
  }

  const ratingMap: Record<string, number> = {
    "1": 5,
    "2": 4,
    "3": 3,
    "4": 2,
    "5": 1,
  };

  return ratingMap[digit] ?? null;
}

export const DEFAULT_CSAT_MESSAGE =
  "شكراً لتواصلك معنا! 😊\nكيف تقيّم تجربتك اليوم؟\nاردّ بـ:\n1️⃣ ممتاز\n2️⃣ جيد\n3️⃣ مقبول\n4️⃣ سيء\n5️⃣ سيء جداً";

export const CSAT_THANK_YOU_MESSAGE = "شكراً على تقييمك! 🙏";
