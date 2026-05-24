/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: AI order creation stays explicit by requiring a hidden ORDER tag.
 * The parser validates the shape before any database write occurs.
 */
export type ParsedOrderItem = {
  product_id?: string;
  name: string;
  qty: number;
  unit_price: number;
};

export type ParsedOrder = {
  items: ParsedOrderItem[];
  subtotal: number;
  notes?: string;
};

const ORDER_TAG_PATTERN = /\[\[ORDER:\s*({[\s\S]*?})\s*\]\]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseOrderTag(replyText: string): ParsedOrder | null {
  const match = replyText.match(ORDER_TAG_PATTERN);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1]) as unknown;

    if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
      return null;
    }

    const items = parsed.items
      .map((item) => {
        if (!isRecord(item) || typeof item.name !== "string") {
          return null;
        }

        const qty = toPositiveInteger(item.qty);
        const unitPrice = toPositiveInteger(item.unit_price);

        if (!qty || !unitPrice) {
          return null;
        }

        const parsedItem: ParsedOrderItem = {
          name: item.name.trim(),
          qty,
          unit_price: unitPrice,
        };

        if (typeof item.product_id === "string") {
          parsedItem.product_id = item.product_id;
        }

        return parsedItem;
      })
      .filter((item): item is ParsedOrderItem => Boolean(item));
    const subtotal = toPositiveInteger(parsed.subtotal);

    if (!items.length || !subtotal) {
      return null;
    }

    return {
      items,
      subtotal,
      notes: typeof parsed.notes === "string" ? parsed.notes.trim() : undefined,
    };
  } catch {
    return null;
  }
}

export function stripOrderTag(replyText: string): string {
  return replyText.replace(ORDER_TAG_PATTERN, "").trim();
}
