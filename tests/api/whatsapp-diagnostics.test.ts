// FILE: tests/api/whatsapp-diagnostics.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: WhatsApp diagnostics tests cover the operator-facing reasons that
 * automatic replies can be blocked before a real customer test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    appEnv: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      WHATSAPP_MOCK_MODE: false,
    },
    getBusinessAccountPhoneNumber: vi.fn(),
    getOrCreateUserSettings: vi.fn(),
    getPhoneProfile: vi.fn(),
    getSubscribedAppsForBusinessAccount: vi.fn(),
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

vi.mock("@/lib/utils/env", () => ({
  appEnv: diagnosticsMocks.appEnv,
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
  getSubscribedAppsForBusinessAccount: diagnosticsMocks.getSubscribedAppsForBusinessAccount,
}));

import { GET } from "@/app/api/whatsapp/diagnostics/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const CONNECTION_ID = "00000000-0000-0000-0000-000000000010";

describe("WhatsApp diagnostics API", () => {
  beforeEach(() => {
    diagnosticsMocks.checkSubscriptionLimit.mockReset();
    diagnosticsMocks.decrypt.mockReset();
    diagnosticsMocks.getBusinessAccountPhoneNumber.mockReset();
    diagnosticsMocks.getOrCreateUserSettings.mockReset();
    diagnosticsMocks.getPhoneProfile.mockReset();
    diagnosticsMocks.getSubscribedAppsForBusinessAccount.mockReset();
    diagnosticsMocks.isWithinWorkingHours.mockReset();
    diagnosticsMocks.prisma.message.findFirst.mockReset();
    diagnosticsMocks.prisma.whatsAppConnection.findFirst.mockReset();
    diagnosticsMocks.requireAppUser.mockReset();
    diagnosticsMocks.sanitizeConnection.mockReset();

    diagnosticsMocks.decrypt.mockImplementation((value: string) => value);
    diagnosticsMocks.sanitizeConnection.mockImplementation((connection: { id: string }) => ({ id: connection.id }));
  });

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
      status: "FAILED",
      aiReplyText: "لم يتم إرسال الرد التلقائي لأن Meta رفضت إرسال رسالة واتساب.",
      processedAt: new Date(),
      updatedAt: new Date(),
    });
    diagnosticsMocks.getPhoneProfile.mockResolvedValueOnce({});
    diagnosticsMocks.getBusinessAccountPhoneNumber.mockResolvedValueOnce({ id: "1234567890" });
    diagnosticsMocks.getSubscribedAppsForBusinessAccount.mockResolvedValueOnce([{ id: "app-1" }]);

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

  it("marks stale automatic reply failures as warnings instead of blocking readiness", async () => {
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
      autoReplyEnabled: true,
      workingHoursEnabled: false,
    });
    diagnosticsMocks.checkSubscriptionLimit.mockResolvedValueOnce({
      allowed: true,
      remaining: 49,
      includedRepliesPerMonth: 50,
      overageCount: 0,
      allowsOverage: false,
      planTier: "FREE",
    });
    diagnosticsMocks.isWithinWorkingHours.mockReturnValueOnce(true);
    diagnosticsMocks.prisma.message.findFirst.mockResolvedValueOnce({
      status: "FAILED",
      aiReplyText: "فشل قديم من Meta.",
      processedAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    diagnosticsMocks.getPhoneProfile.mockResolvedValueOnce({});
    diagnosticsMocks.getBusinessAccountPhoneNumber.mockResolvedValueOnce({ id: "1234567890" });
    diagnosticsMocks.getSubscribedAppsForBusinessAccount.mockResolvedValueOnce([{ id: "app-1" }]);

    const response = await GET(new Request(`http://localhost/api/whatsapp/diagnostics?connectionId=${CONNECTION_ID}`));
    const body = await response.json();
    const checks = body.data.checks as Array<{ id: string; status: string; label: string }>;
    const staleFailure = checks.find((check) => check.id === "recent-auto-reply-failure");

    expect(staleFailure).toEqual(expect.objectContaining({ status: "warning", label: "فشل قديم في الرد التلقائي" }));
  });

  it("uses a read-only subscribed apps check and reports missing webhook subscription", async () => {
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
      autoReplyEnabled: true,
      workingHoursEnabled: false,
    });
    diagnosticsMocks.checkSubscriptionLimit.mockResolvedValueOnce({
      allowed: true,
      remaining: 49,
      includedRepliesPerMonth: 50,
      overageCount: 0,
      allowsOverage: false,
      planTier: "FREE",
    });
    diagnosticsMocks.isWithinWorkingHours.mockReturnValueOnce(true);
    diagnosticsMocks.prisma.message.findFirst.mockResolvedValueOnce(null);
    diagnosticsMocks.getPhoneProfile.mockResolvedValueOnce({});
    diagnosticsMocks.getBusinessAccountPhoneNumber.mockResolvedValueOnce({ id: "1234567890" });
    diagnosticsMocks.getSubscribedAppsForBusinessAccount.mockResolvedValueOnce([]);

    const response = await GET(new Request(`http://localhost/api/whatsapp/diagnostics?connectionId=${CONNECTION_ID}`));
    const body = await response.json();
    const checks = body.data.checks as Array<{ id: string; status: string }>;

    expect(checks.find((check) => check.id === "webhook-subscription")).toEqual(
      expect.objectContaining({ status: "failed" }),
    );
  });
});
