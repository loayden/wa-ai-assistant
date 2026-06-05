// FILE: tests/api/whatsapp-diagnostics.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: WhatsApp diagnostics tests cover the operator-facing reasons that
 * automatic replies can be blocked before a real customer test.
 */
import { describe, expect, it, vi } from "vitest";

const diagnosticsMocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required.") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  class EmbeddedSignupError extends Error {
    public readonly status: number;
    public readonly response: unknown;

    constructor(message = "Meta error", status = 400, response: unknown = {}) {
      super(message);
      this.name = "EmbeddedSignupError";
      this.status = status;
      this.response = response;
    }
  }

  return {
    EmbeddedSignupError,
    UnauthorizedError,
    checkSubscriptionLimit: vi.fn(),
    decrypt: vi.fn((value: string) => value),
    getBusinessAccountPhoneNumber: vi.fn(),
    getOrCreateUserSettings: vi.fn(),
    getPhoneProfile: vi.fn(),
    isWithinWorkingHours: vi.fn(),
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
    },
    prisma: {
      message: {
        findFirst: vi.fn(),
      },
      whatsAppConnection: {
        findFirst: vi.fn(),
      },
    },
    requireAppUser: vi.fn(),
    sanitizeConnection: vi.fn((connection: { id: string }) => ({ id: connection.id })),
    subscribeAppToBusinessAccount: vi.fn(),
  };
});

vi.mock("@/lib/api/auth", () => ({
  UnauthorizedError: diagnosticsMocks.UnauthorizedError,
  requireAppUser: diagnosticsMocks.requireAppUser,
}));

vi.mock("@/lib/api/settings", () => ({
  getOrCreateUserSettings: diagnosticsMocks.getOrCreateUserSettings,
}));

vi.mock("@/lib/api/whatsapp", () => ({
  sanitizeConnection: diagnosticsMocks.sanitizeConnection,
}));

vi.mock("@/lib/assistant/working-hours", () => ({
  isWithinWorkingHours: diagnosticsMocks.isWithinWorkingHours,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: diagnosticsMocks.prisma,
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: diagnosticsMocks.decrypt,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: diagnosticsMocks.logger,
}));

vi.mock("@/lib/utils/subscription", () => ({
  checkSubscriptionLimit: diagnosticsMocks.checkSubscriptionLimit,
}));

vi.mock("@/lib/whatsapp/embedded-signup", () => ({
  EmbeddedSignupError: diagnosticsMocks.EmbeddedSignupError,
  getBusinessAccountPhoneNumber: diagnosticsMocks.getBusinessAccountPhoneNumber,
  getPhoneProfile: diagnosticsMocks.getPhoneProfile,
  subscribeAppToBusinessAccount: diagnosticsMocks.subscribeAppToBusinessAccount,
}));

import { GET } from "@/app/api/whatsapp/diagnostics/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const CONNECTION_ID = "00000000-0000-0000-0000-000000000010";

describe("WhatsApp diagnostics API", () => {
  it("returns automatic reply blockers in diagnostics checks", async () => {
    diagnosticsMocks.requireAppUser.mockResolvedValueOnce({ id: USER_ID });
    diagnosticsMocks.prisma.whatsAppConnection.findFirst.mockResolvedValueOnce({
      id: CONNECTION_ID,
      userId: USER_ID,
      phoneNumberId: "1234567890",
      businessAccountId: "9876543210",
      accessToken: "encrypted-token",
      isActive: true,
      isVerified: true,
    });
    diagnosticsMocks.getOrCreateUserSettings.mockResolvedValueOnce({
      autoReplyEnabled: false,
      workingHoursEnabled: true,
    });
    diagnosticsMocks.checkSubscriptionLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      includedRepliesPerMonth: 50,
      overageCount: 0,
      allowsOverage: false,
      planTier: "FREE",
    });
    diagnosticsMocks.isWithinWorkingHours.mockReturnValueOnce(false);
    diagnosticsMocks.prisma.message.findFirst.mockResolvedValueOnce({
      aiReplyText: "لم يتم إرسال الرد التلقائي لأن Meta رفضت إرسال رسالة واتساب.",
    });

    const response = await GET(new Request(`http://localhost/api/whatsapp/diagnostics?connectionId=${CONNECTION_ID}`));
    const body = await response.json();
    const checks = body.data.checks as Array<{ id: string; status: string; detail: string }>;

    expect(response.status).toBe(200);
    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "auto-reply", status: "failed" }),
        expect.objectContaining({ id: "reply-limit", status: "failed" }),
        expect.objectContaining({ id: "working-hours", status: "warning" }),
        expect.objectContaining({ id: "recent-auto-reply-failure", status: "failed" }),
      ]),
    );
    expect(checks.find((check) => check.id === "recent-auto-reply-failure")?.detail).toContain("Meta رفضت");
  });
});
