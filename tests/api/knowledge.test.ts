// FILE: tests/api/knowledge.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Knowledge API tests assert tenant scoping and singleton upsert
 * behavior without touching a real Supabase database.
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
      knowledgeBaseEntry: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
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

import { DELETE, PATCH } from "@/app/api/knowledge/[id]/route";
import { GET, POST } from "@/app/api/knowledge/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const ENTRY_ID = "00000000-0000-0000-0000-000000000010";

function makeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ENTRY_ID,
    userId: USER_ID,
    type: "faq",
    title: "Delivery",
    content: "We deliver across Cairo.",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    ...overrides,
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/knowledge", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("knowledge API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.requireAppUser.mockResolvedValue({ id: USER_ID });
    apiMocks.prisma.knowledgeBaseEntry.findMany.mockResolvedValue([]);
    apiMocks.prisma.knowledgeBaseEntry.findFirst.mockResolvedValue(null);
  });

  it("fetches current-user knowledge entries", async () => {
    apiMocks.prisma.knowledgeBaseEntry.findMany.mockResolvedValueOnce([makeEntry()]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.entries).toHaveLength(1);
    expect(apiMocks.prisma.knowledgeBaseEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
      }),
    );
  });

  it("creates FAQ entries", async () => {
    apiMocks.prisma.knowledgeBaseEntry.create.mockResolvedValueOnce(makeEntry());

    const response = await POST(
      jsonRequest({
        type: "faq",
        title: "Delivery",
        content: "We deliver across Cairo.",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.entry.title).toBe("Delivery");
    expect(apiMocks.prisma.knowledgeBaseEntry.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        type: "faq",
        title: "Delivery",
        content: "We deliver across Cairo.",
      },
    });
  });

  it("upserts singleton business info entries", async () => {
    apiMocks.prisma.knowledgeBaseEntry.findFirst.mockResolvedValueOnce(makeEntry({ type: "text" }));
    apiMocks.prisma.knowledgeBaseEntry.update.mockResolvedValueOnce(makeEntry({ type: "text", title: "Business Info" }));

    const response = await POST(
      jsonRequest({
        type: "text",
        title: "Business Info",
        content: "We are a clinic in Cairo.",
      }),
    );

    expect(response.status).toBe(200);
    expect(apiMocks.prisma.knowledgeBaseEntry.update).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: {
        title: "Business Info",
        content: "We are a clinic in Cairo.",
      },
    });
  });

  it("updates only entries owned by the current user", async () => {
    apiMocks.prisma.knowledgeBaseEntry.findFirst.mockResolvedValueOnce(makeEntry());
    apiMocks.prisma.knowledgeBaseEntry.update.mockResolvedValueOnce(makeEntry({ title: "Prices" }));

    const response = await PATCH(jsonRequest({ title: "Prices" }), { params: Promise.resolve({ id: ENTRY_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.entry.title).toBe("Prices");
    expect(apiMocks.prisma.knowledgeBaseEntry.findFirst).toHaveBeenCalledWith({
      where: {
        id: ENTRY_ID,
        userId: USER_ID,
      },
    });
  });

  it("deletes only entries owned by the current user", async () => {
    apiMocks.prisma.knowledgeBaseEntry.findFirst.mockResolvedValueOnce(makeEntry());
    apiMocks.prisma.knowledgeBaseEntry.delete.mockResolvedValueOnce(makeEntry());

    const response = await DELETE(new Request("http://localhost/api/knowledge"), { params: Promise.resolve({ id: ENTRY_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(apiMocks.prisma.knowledgeBaseEntry.delete).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
    });
  });
});
