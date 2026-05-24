import { describe, expect, it } from "vitest";

import { isWithinWorkingHours } from "@/lib/assistant/working-hours";

describe("isWithinWorkingHours", () => {
  it("allows replies when the feature is disabled", () => {
    expect(
      isWithinWorkingHours(
        {
          workingHoursEnabled: false,
          workingDays: [],
          workingHoursStart: "09:00",
          workingHoursEnd: "17:00",
          timezone: "Africa/Cairo",
        },
        new Date("2026-05-22T01:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("blocks replies on a closed day", () => {
    expect(
      isWithinWorkingHours(
        {
          workingHoursEnabled: true,
          workingDays: ["saturday", "sunday"],
          workingHoursStart: "09:00",
          workingHoursEnd: "22:00",
          timezone: "Africa/Cairo",
        },
        new Date("2026-05-22T10:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("allows replies inside same-day hours", () => {
    expect(
      isWithinWorkingHours(
        {
          workingHoursEnabled: true,
          workingDays: ["saturday"],
          workingHoursStart: "09:00",
          workingHoursEnd: "22:00",
          timezone: "Africa/Cairo",
        },
        new Date("2026-05-23T10:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("supports overnight hours", () => {
    expect(
      isWithinWorkingHours(
        {
          workingHoursEnabled: true,
          workingDays: ["saturday"],
          workingHoursStart: "20:00",
          workingHoursEnd: "03:00",
          timezone: "Africa/Cairo",
        },
        new Date("2026-05-23T22:30:00.000Z"),
      ),
    ).toBe(true);
  });
});
