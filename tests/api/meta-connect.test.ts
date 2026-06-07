import { beforeEach, describe, expect, it, vi } from "vitest";

const metaConnectMocks = vi.hoisted(() => {
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
      whatsAppConnection: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/api/auth", () => ({
  UnauthorizedError: metaConnectMocks.UnauthorizedError,
  requireAppUser: metaConnectMocks.requireAppUser,
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: metaConnectMocks.prisma,
}));

vi.mock("@/lib/utils/encryption", () => ({
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST as connectPage } from "@/app/api/meta/connect-page/route";

const USER_ID = "00000000-0000-0000-0000-000000000001";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/meta/connect-page", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeConnection(data: Record<string, unknown>) {
  return {
    id: "00000000-0000-0000-0000-000000000011",
    ownerPhoneNumber: null,
    createdAt: new Date("2026-06-06T00:00:00.000Z"),
    updatedAt: new Date("2026-06-06T00:00:00.000Z"),
    ...data,
  };
}

describe("Meta connect page API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    metaConnectMocks.requireAppUser.mockResolvedValue({ id: USER_ID });
    metaConnectMocks.prisma.whatsAppConnection.findFirst.mockResolvedValue(null);
    metaConnectMocks.prisma.whatsAppConnection.create.mockImplementation(async (params: { data: Record<string, unknown> }) => makeConnection(params.data));
  });

  it("stores partial state when permissions are granted but webhook verification does not list the current app", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);

      if (requestUrl.includes("/me/permissions")) {
        return Response.json({
          data: [
            { permission: "pages_messaging", status: "granted" },
            { permission: "pages_manage_metadata", status: "granted" },
          ],
        });
      }

      if (requestUrl.includes("/debug_token")) {
        return Response.json({
          data: {
            is_valid: true,
            type: "PAGE",
            scopes: ["pages_messaging", "pages_manage_metadata"],
          },
        });
      }

      if (requestUrl.includes("/page-1/subscribed_apps") && init?.method === "POST") {
        return Response.json({ success: true });
      }

      if (requestUrl.includes("/page-1/subscribed_apps")) {
        return Response.json({
          data: [{ id: "another-app", subscribed_fields: ["messages"] }],
        });
      }

      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await connectPage(
      jsonRequest({
        pageId: "page-1",
        pageName: "FR3",
        pageAccessToken: "page-token",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.permissionStatus).toBe("partial");
    expect(body.data.webhookSubscribed).toBe(false);
    expect(metaConnectMocks.prisma.whatsAppConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        permissionStatus: "partial",
        webhookSubscribed: false,
        isActive: false,
        isVerified: false,
      }),
    });
  });
});
