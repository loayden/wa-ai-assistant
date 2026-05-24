/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Topic routing must be deterministic in the webhook path, so a
 * local classifier handles common Egyptian/Arabic and English phrases without
 * adding another network call before replying to customers.
 */
export type TopicName = "order" | "complaint" | "billing" | "product_inquiry" | "appointment" | "other";

export type RoutingRuleLike = {
  topic: string;
  keywords: string[];
  isActive: boolean;
};

const TOPIC_PATTERNS: Array<{ topic: TopicName; patterns: RegExp[] }> = [
  {
    topic: "complaint",
    patterns: [/زعلان|غلط|وحش|سيء|مشكلة|اتأخر|تأخير|مش راضي|حرام|complain|complaint|bad|angry|late/i],
  },
  {
    topic: "billing",
    patterns: [/دفع|دفعت|فاتورة|فلوس|استرجاع|استرداد|payment|paid|invoice|refund|billing|charge/i],
  },
  {
    topic: "order",
    patterns: [/اطلب|طلب|عايز|عاوز|اوردر|أوردر|order|buy|purchase|deliver|delivery|توصيل/i],
  },
  {
    topic: "appointment",
    patterns: [/ميعاد|حجز|احجز|موعد|appointment|booking|book/i],
  },
  {
    topic: "product_inquiry",
    patterns: [/سعر|كام|متوفر|موجود|price|available|how much|cost/i],
  },
];

export function detectTopicFromText(message: string): TopicName {
  for (const item of TOPIC_PATTERNS) {
    if (item.patterns.some((pattern) => pattern.test(message))) {
      return item.topic;
    }
  }

  return "other";
}

export function findRoutingRuleForTopic<T extends RoutingRuleLike>(params: {
  message: string;
  rules: T[];
  topic: TopicName;
}): T | null {
  const normalized = params.message.toLowerCase();

  return (
    params.rules.find((rule) => {
      if (!rule.isActive) {
        return false;
      }

      if (rule.topic === params.topic) {
        return true;
      }

      return rule.topic === "custom" && rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
    }) ?? null
  );
}
