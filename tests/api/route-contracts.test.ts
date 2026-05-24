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
      conversationHandoff: {
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
    expectedInputs: ["Supabase session", "page", "limit", "direction", "status", "connectionId"],
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
    route: "/api/assistant/test",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "message"],
    successResponse: "replyText/modelUsed/tokensUsed without consuming reply quota",
    expectedErrors: [400, 401, 422, 500, 503],
  },
  {
    route: "/api/knowledge",
    methods: ["GET", "POST"],
    expectedInputs: ["Supabase session", "type/title/content for POST"],
    successResponse: "knowledge entries list or saved entry",
    expectedErrors: [400, 401, 422, 500, 503],
  },
  {
    route: "/api/knowledge/[id]",
    methods: ["PATCH", "DELETE"],
    expectedInputs: ["Supabase session", "owned knowledge id", "title/content for PATCH"],
    successResponse: "updated entry or deleted=true",
    expectedErrors: [400, 401, 404, 422, 500, 503],
  },
  {
    route: "/api/onboarding",
    methods: ["POST"],
    expectedInputs: ["Supabase session"],
    successResponse: "onboardingCompleted=true",
    expectedErrors: [401, 500, 503],
  },
  {
    route: "/api/whatsapp/send",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "connectionId", "to", "message"],
    successResponse: "created outbound message",
    expectedErrors: [400, 401, 404, 422, 500, 502, 503],
  },
  {
    route: "/api/leads",
    methods: ["GET"],
    expectedInputs: ["Supabase session", "status filter", "channel filter"],
    successResponse: "lead list with masked phone numbers",
    expectedErrors: [401, 422, 500, 503],
  },
  {
    route: "/api/leads/[id]",
    methods: ["PATCH"],
    expectedInputs: ["Supabase session", "owned lead id", "status"],
    successResponse: "updated lead",
    expectedErrors: [400, 401, 404, 422, 500, 503],
  },
  {
    route: "/api/leads/export",
    methods: ["GET"],
    expectedInputs: ["Supabase session"],
    successResponse: "CSV download of leads",
    expectedErrors: [401, 500, 503],
  },
  {
    route: "/api/conversations/[id]/handoff",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "message id representing a thread"],
    successResponse: "handoff active",
    expectedErrors: [401, 404, 422, 500, 503],
  },
  {
    route: "/api/conversations/[id]/resume",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "message id representing a thread"],
    successResponse: "handoff inactive",
    expectedErrors: [401, 404, 422, 500, 503],
  },
  {
    route: "/api/conversations/[id]/reply",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "message id representing a thread", "manual reply body"],
    successResponse: "manual WhatsApp reply saved",
    expectedErrors: [400, 401, 404, 422, 500, 502, 503],
  },
  {
    route: "/api/conversations/[id]/resolve",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "message id representing a thread"],
    successResponse: "conversation resolved and optional CSAT request sent",
    expectedErrors: [401, 404, 422, 500, 502, 503],
  },
  {
    route: "/api/analytics/summary",
    methods: ["GET"],
    expectedInputs: ["Supabase session", "range=7d|30d"],
    successResponse: "assistant impact summary",
    expectedErrors: [401, 422, 500, 503],
  },
  {
    route: "/api/cron/process-broadcasts",
    methods: ["GET"],
    expectedInputs: ["Bearer CRON_SECRET in production", "broadcasts with status=sending"],
    successResponse: "bounded broadcast queue processing summary",
    expectedErrors: [403, 500, 503],
  },
  {
    route: "/api/cron/daily-summary",
    methods: ["GET"],
    expectedInputs: ["Bearer CRON_SECRET in production"],
    successResponse: "processed and emailed counts",
    expectedErrors: [403, 500, 503],
  },
  {
    route: "/api/cron/weekly-report",
    methods: ["GET"],
    expectedInputs: ["Bearer CRON_SECRET in production", "weekly_report notification preference"],
    successResponse: "processed, emailed, and skipped counts",
    expectedErrors: [403, 500, 503],
  },
  {
    route: "/api/templates",
    methods: ["GET", "POST"],
    expectedInputs: ["Supabase session", "template body for POST", "optional status filter"],
    successResponse: "template list or created Meta-submitted template",
    expectedErrors: [400, 401, 404, 422, 500, 503],
  },
  {
    route: "/api/templates/[id]",
    methods: ["DELETE"],
    expectedInputs: ["Supabase session", "owned template id"],
    successResponse: "deleted=true",
    expectedErrors: [401, 404, 500, 503],
  },
  {
    route: "/api/templates/sync",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "connected WhatsApp number with WABA id"],
    successResponse: "templates with refreshed approval statuses",
    expectedErrors: [401, 500, 503],
  },
  {
    route: "/api/templates/[id]/send",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "approved template id", "to", "parameters"],
    successResponse: "providerMessageId for template send",
    expectedErrors: [400, 401, 404, 422, 500, 502, 503],
  },
  {
    route: "/api/broadcasts",
    methods: ["GET", "POST"],
    expectedInputs: ["Supabase session", "templateId", "recipients", "parameters"],
    successResponse: "broadcast list or created broadcast",
    expectedErrors: [400, 401, 404, 422, 500, 503],
  },
  {
    route: "/api/broadcasts/[id]/send",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "owned broadcast id", "paid plan"],
    successResponse: "sent and failed counts",
    expectedErrors: [401, 403, 404, 500, 502, 503],
  },
  {
    route: "/api/broadcasts/[id]/process",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "owned broadcast id with status=sending"],
    successResponse: "bounded client-driven processing progress",
    expectedErrors: [401, 404, 429, 500, 502, 503],
  },
  {
    route: "/api/broadcasts/[id]/status",
    methods: ["GET"],
    expectedInputs: ["Supabase session", "owned broadcast id"],
    successResponse: "broadcast sending progress",
    expectedErrors: [401, 404, 500, 503],
  },
  {
    route: "/api/products",
    methods: ["GET", "POST"],
    expectedInputs: ["Supabase session", "name/price/category for POST"],
    successResponse: "product catalog list or created product",
    expectedErrors: [400, 401, 422, 500, 503],
  },
  {
    route: "/api/products/[id]",
    methods: ["PATCH", "DELETE"],
    expectedInputs: ["Supabase session", "owned product id", "partial product body for PATCH"],
    successResponse: "updated product or deleted=true",
    expectedErrors: [400, 401, 404, 422, 500, 503],
  },
  {
    route: "/api/orders",
    methods: ["GET"],
    expectedInputs: ["Supabase session", "status filter"],
    successResponse: "order list with payment status",
    expectedErrors: [401, 422, 500, 503],
  },
  {
    route: "/api/orders/[id]",
    methods: ["PATCH"],
    expectedInputs: ["Supabase session", "owned order id", "status/customer fields"],
    successResponse: "updated order and optional customer status message",
    expectedErrors: [400, 401, 404, 422, 500, 502, 503],
  },
  {
    route: "/api/orders/[id]/payment-link",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "owned unpaid order id", "active WhatsApp connection"],
    successResponse: "Paymob payment link sent to customer",
    expectedErrors: [400, 401, 404, 422, 500, 502, 503],
  },
  {
    route: "/api/corrections",
    methods: ["GET"],
    expectedInputs: ["Supabase session"],
    successResponse: "saved AI correction examples",
    expectedErrors: [401, 500, 503],
  },
  {
    route: "/api/corrections/[id]",
    methods: ["DELETE"],
    expectedInputs: ["Supabase session", "owned correction id"],
    successResponse: "deleted=true",
    expectedErrors: [401, 404, 422, 500, 503],
  },
  {
    route: "/api/messages/[id]/correct",
    methods: ["POST"],
    expectedInputs: ["Supabase session", "owned AI message id", "correctReply"],
    successResponse: "corrected reply sent and saved as training example",
    expectedErrors: [400, 401, 404, 422, 500, 502, 503],
  },
];

describe("API route contracts", () => {
  it("documents expected inputs, success responses, and error responses for each route", () => {
    expect(apiRouteContracts).toHaveLength(41);

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
    apiMocks.prisma.conversationHandoff.findMany.mockResolvedValueOnce([]);
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
