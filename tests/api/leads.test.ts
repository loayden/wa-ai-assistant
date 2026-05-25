// FILE: tests/api/leads.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Leads API tests cover tenant-scoped reads, inline status updates,
 * and CSV export without touching the real database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required.") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  return {
    UnauthorizedError,
    requireAppUser: vi.fn(),
    prisma: {
      lead: {
        count: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      instagramCommentLead: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/api/auth", () => ({
  UnauthorizedError: apiMocks.UnauthorizedError,
  requireAppUser: apiMocks.requireAppUser,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: apiMocks.prisma,
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { PATCH } from "@/app/api/leads/[id]/route";
import { GET as EXPORT } from "@/app/api/leads/export/route";
import { GET } from "@/app/api/leads/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const LEAD_ID = "00000000-0000-0000-0000-000000000011";

function makeLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: LEAD_ID,
    userId: USER_ID,
    messageId: "00000000-0000-0000-0000-000000000021",
    connectionId: "00000000-0000-0000-0000-000000000031",
    customerPhone: "201144999221",
    customerName: null,
    interest: "Asked about delivery pricing.",
    channel: "whatsapp",
    externalId: null,
    senderName: null,
    source: "chat",
    status: "new",
    detectedAt: new Date("2026-05-22T18:00:00.000Z"),
    createdAt: new Date("2026-05-22T18:00:00.000Z"),
    updatedAt: new Date("2026-05-22T18:00:00.000Z"),
    ...overrides,
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/leads", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("leads API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.requireAppUser.mockResolvedValue({ id: USER_ID });
    apiMocks.prisma.lead.count.mockResolvedValue(1);
    apiMocks.prisma.lead.findMany.mockResolvedValue([makeLead()]);
    apiMocks.prisma.lead.findFirst.mockResolvedValue(makeLead());
    apiMocks.prisma.instagramCommentLead.findMany.mockResolvedValue([]);
  });

  it("fetches current-user leads with filters", async () => {
    const response = await GET(new Request("http://localhost/api/leads?status=new&channel=whatsapp"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.leads).toHaveLength(1);
    expect(body.data.leads[0].customerPhoneMasked).toBe("•••• 9221");
    expect(apiMocks.prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: USER_ID,
          status: "new",
          channel: "whatsapp",
        },
      }),
    );
  });

  it("updates lead status for the owner only", async () => {
    apiMocks.prisma.lead.update.mockResolvedValueOnce(makeLead({ status: "contacted" }));

    const response = await PATCH(jsonRequest({ status: "contacted" }), { params: Promise.resolve({ id: LEAD_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.lead.status).toBe("contacted");
    expect(apiMocks.prisma.lead.findFirst).toHaveBeenCalledWith({
      where: {
        id: LEAD_ID,
        userId: USER_ID,
      },
    });
    expect(apiMocks.prisma.lead.update).toHaveBeenCalledWith({
      where: { id: LEAD_ID },
      data: { status: "contacted" },
    });
  });

  it("exports current-user leads as CSV", async () => {
    const response = await EXPORT();
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("leads.csv");
    expect(csv).toContain("Phone,External ID,Sender Name,Interest,Channel,Source,Status,Date");
    expect(csv).toContain("201144999221");
  });
});
