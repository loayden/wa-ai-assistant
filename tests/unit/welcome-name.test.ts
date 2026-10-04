import { describe, expect, it } from "vitest";

import { resolveWelcomeName } from "@/components/onboarding/FirstRunWelcome";

describe("resolveWelcomeName", () => {
  it("uses the first name token", () => {
    expect(resolveWelcomeName("أحمد محمد")).toBe("أحمد");
    expect(resolveWelcomeName("  ليلى  ")).toBe("ليلى");
  });

  it("falls back to null when no usable name exists", () => {
    expect(resolveWelcomeName(null)).toBeNull();
    expect(resolveWelcomeName(undefined)).toBeNull();
    expect(resolveWelcomeName("   ")).toBeNull();
  });
});
