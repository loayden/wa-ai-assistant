import { describe, expect, it } from "vitest";

import { parseCsatRating } from "@/lib/assistant/csat";

describe("parseCsatRating", () => {
  it("maps customer reply choices to star ratings", () => {
    expect(parseCsatRating("1")).toBe(5);
    expect(parseCsatRating("2 جيد")).toBe(4);
    expect(parseCsatRating("3")).toBe(3);
    expect(parseCsatRating("4")).toBe(2);
    expect(parseCsatRating("5")).toBe(1);
  });

  it("ignores non-rating messages", () => {
    expect(parseCsatRating("شكراً")).toBeNull();
    expect(parseCsatRating("10")).toBeNull();
    expect(parseCsatRating("")).toBeNull();
  });
});
