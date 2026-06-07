import { describe, expect, it } from "vitest";

import { calculateReadinessScore } from "@/lib/readiness/checks";
import type { ReadinessCheck } from "@/types/api";

function check(status: ReadinessCheck["status"], points: number): ReadinessCheck {
  return {
    id: `check-${status}-${points}`,
    label: "فحص",
    status,
    message: "نتيجة الفحص",
    points,
    category: "business",
  };
}

describe("launch readiness scoring", () => {
  it("gives pass full points, warn half points, and fail zero", () => {
    expect(calculateReadinessScore([check("pass", 20), check("warn", 10), check("fail", 10)])).toBe(63);
  });

  it("returns zero when there are no checks", () => {
    expect(calculateReadinessScore([])).toBe(0);
  });
});
