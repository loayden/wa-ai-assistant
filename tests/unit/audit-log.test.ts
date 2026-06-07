// FILE: tests/unit/audit-log.test.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Audit logs are security evidence, so tests verify both redaction and
 * the write payload sent to Prisma.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const auditMocks = vi.hoisted(() => ({
  create: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    auditLog: {
      create: auditMocks.create,
    },
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: auditMocks.loggerWarn,
  },
}));

import { sanitizeAuditMetadata, writeAuditLog } from "@/lib/security/audit-log";

describe("audit log helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditMocks.create.mockResolvedValue({ id: "audit-1" });
  });

  it("redacts nested credentials before persistence", () => {
    const metadata = sanitizeAuditMetadata({
      accessToken: "raw-token",
      safe: "visible",
      nested: {
        clientSecret: "raw-secret",
        authorization: "Bearer raw",
      },
    });

    expect(JSON.parse(JSON.stringify(metadata))).toEqual({
      accessToken: "[redacted]",
      safe: "visible",
      nested: {
        clientSecret: "[redacted]",
        authorization: "[redacted]",
      },
    });
  });

  it("writes a tenant-scoped audit record with request context", async () => {
    const request = new Request("https://kallem.test/api/settings", {
      headers: {
        "x-forwarded-for": "203.0.113.20, 10.0.0.2",
        "user-agent": "Vitest Browser",
      },
    });

    await writeAuditLog({
      userId: "00000000-0000-0000-0000-000000000001",
      action: "settings.updated",
      entityType: "user_settings",
      entityId: "00000000-0000-0000-0000-000000000001",
      metadata: {
        changedFields: ["businessName"],
        accessToken: "raw-token",
      },
      request,
    });

    expect(auditMocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "00000000-0000-0000-0000-000000000001",
        action: "settings.updated",
        entityType: "user_settings",
        entityId: "00000000-0000-0000-0000-000000000001",
        metadata: {
          changedFields: ["businessName"],
          accessToken: "[redacted]",
        },
        ipAddress: "203.0.113.20",
        userAgent: "Vitest Browser",
      }),
    });
  });
});
