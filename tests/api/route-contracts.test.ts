// FILE: tests/api/route-contracts.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: API route contracts are executable documentation, and the messages
 * route is directly tested with mocked auth and Prisma boundaries.
 */
import { describe, expect, it, vi } from "vitest";

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
      $transaction: vi.fn(),
      message: {
        findMany: vi.fn(),
        count: vi.fn(),
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

import { GET as getMessages } from "@/app/api/messages/route";
import { jsonDatabaseUnavailableIfNeeded } from "@/lib/api/response";

type ApiRouteContract = {
  route: string;
  methods: string[];
  expectedInputs: string[];
  successResponse: string;
  expectedErrors: number[];
};

const apiRouteContracts: ApiRouteContract[] = [
  {
    route: "/api/auth",
    methods: ["POST"],
    expectedInputs: ["action=login|signup|logout", "email/password for login", "email/password/fullName for signup"],
    successResponse: "user or signedOut envelope",
    expectedErrors: [400, 401, 422, 429, 500, 503],
  },
  {
    route: "/api/whatsapp/connect",
    methods: ["GET", "POST", "DELETE"],
    expectedInputs: ["Supabase session", "connection body for POST", "id query parameter for DELETE"],
    successResponse: "connection list, created connection, or deleted=true",
    expectedErrors: [400, 401, 403, 404, 422, 500, 503],
  },
  {
    route: "/api/webhooks/whatsapp",
    methods: ["GET", "POST"],
    expectedInputs: ["hub.* verification query", "X-Hub-Signature-256", "Meta webhook payload"],
    successResponse: "challenge string or processed message results",
    expectedErrors: [400, 403, 422, 500, 503],
  },
  {
    route: "/api/messages",
    methods: ["GET"],
    expectedInputs: ["Supabase session", "page", "limit", "direction", "status"],
    successResponse: "paginated message array with total/page/limit meta",
    expectedErrors: [401, 422, 500, 503],
  },
  {
    route: "/api/settings",
    methods: ["GET", "PUT"],
    expectedInputs: ["Supabase session", "partial settings body for PUT"],
    successResponse: "settings and user summary",
    expectedErrors: [400, 401, 403, 422, 500, 503],
  },
  {
    route: "/api/billing/create-checkout",
    methods: ["POST"],
    expectedInputs: ["Supabase session"],
    successResponse: "Stripe Checkout URL",
    expectedErrors: [401, 500, 502, 503],
  },
  {
    route: "/api/billing/portal",
    methods: ["GET"],
    expectedInputs: ["Supabase session with stripeCustomerId"],
    successResponse: "Stripe Billing Portal URL",
    expectedErrors: [400, 401, 500, 503],
  },
  {
    route: "/api/webhooks/stripe",
    methods: ["POST"],
    expectedInputs: ["stripe-signature header", "raw Stripe event payload"],
    successResponse: "received=true",
    expectedErrors: [400, 500, 503],
  },
  {
    route: "/api/ai/reply",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "message", "connectionId"],
    successResponse: "replyText/modelUsed/tokensUsed",
    expectedErrors: [400, 401, 403, 404, 422, 500, 503],
  },
  {
    route: "/api/whatsapp/send",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "connectionId", "to", "message"],
    successResponse: "created outbound message",
    expectedErrors: [400, 401, 404, 422, 500, 502, 503],
  },
];

describe("API route contracts", () => {
  it("documents expected inputs, success responses, and error responses for each route", () => {
    expect(apiRouteContracts).toHaveLength(10);

    for (const contract of apiRouteContracts) {
      expect(contract.route).toMatch(/^\/api\//);
      expect(contract.methods.length).toBeGreaterThan(0);
      expect(contract.expectedInputs.length).toBeGreaterThan(0);
      expect(contract.successResponse.length).toBeGreaterThan(0);
      expect(contract.expectedErrors.length).toBeGreaterThan(0);
    }
  });

  it("returns paginated messages for an authenticated user", async () => {
    apiMocks.requireAppUser.mockResolvedValueOnce({ id: "user-1" });
    apiMocks.prisma.$transaction.mockResolvedValueOnce([
      [
        {
          id: "message-1",
          userId: "user-1",
          connectionId: "connection-1",
          waMessageId: "wamid.test",
          direction: "INBOUND",
          fromNumber: "15555550100",
          toNumber: "15555550199",
          bodyText: "Hello",
          mediaUrl: null,
          mediaType: null,
          status: "REPLIED",
          aiReplyText: "Hi",
          aiModelUsed: "gpt-4o",
          aiTokensUsed: 12,
          processedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          connection: {
            id: "connection-1",
            displayName: "Support",
            phoneNumberId: "1234567890",
          },
        },
      ],
      1,
    ]);

    const response = await getMessages(new Request("http://localhost/api/messages?page=1&limit=20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(apiMocks.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      }),
    );
    expect(apiMocks.prisma.message.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: "user-1" }),
    });
  });

  it("rejects unauthenticated message reads", async () => {
    apiMocks.requireAppUser.mockRejectedValueOnce(new apiMocks.UnauthorizedError());

    const response = await getMessages(new Request("http://localhost/api/messages"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("rejects invalid message query parameters", async () => {
    apiMocks.requireAppUser.mockResolvedValueOnce({ id: "user-1" });

    const response = await getMessages(new Request("http://localhost/api/messages?page=0"));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("Validation failed.");
  });

  it("returns retryable 503 responses for database connectivity failures", async () => {
    const response = jsonDatabaseUnavailableIfNeeded(
      "tests.api",
      new Error("Can't reach database server at localhost:5432"),
    );
    const body = await response?.json();

    expect(response?.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Database temporarily unavailable. Please retry shortly.");
    expect(body.meta.retry).toBe("Retry after a short delay.");
  });
});
