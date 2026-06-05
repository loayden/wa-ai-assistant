import { describe, expect, it } from "vitest";

import { formatStableMoney, formatStableNumber } from "@/lib/utils/format";

describe("stable UI formatters", () => {
  it("formats numbers without depending on runtime locale output", () => {
    expect(formatStableNumber(0)).toBe("0");
    expect(formatStableNumber(50)).toBe("50");
    expect(formatStableNumber(2000)).toBe("2,000");
    expect(formatStableNumber(10000)).toBe("10,000");
  });

  it("formats money as whole EGP values", () => {
    expect(formatStableMoney(999)).toBe("999");
    expect(formatStableMoney(2499)).toBe("2,499");
  });
});
