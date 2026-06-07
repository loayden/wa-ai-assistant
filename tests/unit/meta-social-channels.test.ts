import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { instagramAdapter } from "@/lib/channels/adapters/instagram";
import { messengerAdapter } from "@/lib/channels/adapters/messenger";
import { getInstagramPageLinkIssue, INSTAGRAM_PAGE_LINK_REQUIRED_MESSAGE } from "@/lib/meta/instagram";
import { INSTAGRAM_DM_PERMISSION_REQUIREMENTS, hasPermissionRequirements, missingPermissionLabels } from "@/lib/meta/permissions";
import { buildMetaRedirectUriMismatchMessage, getMetaRedirectUriStatus } from "@/lib/meta/redirect";
import { verifyMetaSignature } from "@/lib/meta/signature";
import { getGrantedPermissions, inspectMetaAccessToken, subscribePageToWebhook } from "@/lib/meta/social";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Meta social channel adapters", () => {
  it("normalizes Messenger text and image messages and ignores echoes", () => {
    const normalized = messengerAdapter.normalizeWebhookEvent({
      id: "page-1",
      messaging: [
        {
          sender: { id: "psid-1" },
          timestamp: 1770000000000,
          message: { mid: "mid-text", text: "hello" },
        },
        {
          sender: { id: "psid-2" },
          timestamp: 1770000000001,
          message: { mid: "mid-image", attachments: [{ type: "image" }] },
        },
        {
          sender: { id: "page-1" },
          timestamp: 1770000000002,
          message: { mid: "mid-echo", text: "echo", is_echo: true },
        },
      ],
    });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({
      channel: "messenger",
      externalMessageId: "mid-text",
      externalThreadId: "psid-1",
      messageType: "text",
      pageId: "page-1",
      text: "hello",
    });
    expect(normalized[1]).toMatchObject({
      channel: "messenger",
      externalMessageId: "mid-image",
      messageType: "image",
    });
  });

  it("normalizes Instagram text messages and unknown non-text messages", () => {
    const normalized = instagramAdapter.normalizeWebhookEvent({
      id: "ig-1",
      messaging: [
        {
          sender: { id: "igsid-1" },
          timestamp: 1770000000000,
          message: { mid: "ig-mid-text", text: "بكام؟" },
        },
        {
          sender: { id: "igsid-2" },
          timestamp: 1770000000001,
          message: { mid: "ig-mid-unknown", attachments: [{ type: "template" }] },
        },
      ],
    });

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({
      channel: "instagram",
      externalMessageId: "ig-mid-text",
      externalThreadId: "igsid-1",
      instagramAccountId: "ig-1",
      messageType: "text",
      text: "بكام؟",
    });
    expect(normalized[1]).toMatchObject({
      channel: "instagram",
      messageType: "unknown",
    });
  });

  it("sends Instagram replies from the Instagram account endpoint", async () => {
    vi.resetModules();
    vi.doMock("@/lib/utils/env", () => ({
      appEnv: {
        WHATSAPP_API_VERSION: "v19.0",
        WHATSAPP_MOCK_MODE: false,
      },
    }));

    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ message_id: "ig-out-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { instagramAdapter: realInstagramAdapter } = await import("@/lib/channels/adapters/instagram");
    await expect(
      realInstagramAdapter.sendText({
        connectionId: "connection-1",
        recipientId: "igsid-1",
        text: "أهلاً",
        accessToken: "page-token",
        phoneNumberId: "ig-1",
      }),
    ).resolves.toEqual({ success: true, externalMessageId: "ig-out-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v19.0/ig-1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer page-token",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      recipient: { id: "igsid-1" },
      message: { text: "أهلاً" },
    });

    vi.doUnmock("@/lib/utils/env");
  });

  it("falls back to the Page send endpoint when Meta rejects the Instagram account endpoint capability", async () => {
    vi.resetModules();
    vi.doMock("@/lib/utils/env", () => ({
      appEnv: {
        WHATSAPP_API_VERSION: "v19.0",
        WHATSAPP_MOCK_MODE: false,
      },
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              message: "(#3) Application does not have the capability to make this API call.",
              type: "OAuthException",
              code: 3,
            },
          },
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ message_id: "page-out-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { instagramAdapter: realInstagramAdapter } = await import("@/lib/channels/adapters/instagram");
    await expect(
      realInstagramAdapter.sendText({
        connectionId: "connection-1",
        recipientId: "igsid-1",
        text: "أهلاً",
        accessToken: "page-token",
        pageId: "page-1",
        phoneNumberId: "ig-1",
      }),
    ).resolves.toEqual({ success: true, externalMessageId: "page-out-1" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://graph.facebook.com/v19.0/ig-1/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://graph.facebook.com/v19.0/page-1/messages",
      expect.objectContaining({ method: "POST" }),
    );

    vi.doUnmock("@/lib/utils/env");
  });
});

describe("Meta social webhook signature", () => {
  it("accepts valid signatures and rejects invalid signatures", () => {
    const rawBody = JSON.stringify({ object: "page", entry: [] });
    const signature = `sha256=${createHmac("sha256", process.env.WHATSAPP_APP_SECRET!).update(rawBody).digest("hex")}`;

    expect(verifyMetaSignature(rawBody, signature)).toBe(true);
    expect(verifyMetaSignature(rawBody, "sha256=bad")).toBe(false);
    expect(verifyMetaSignature(rawBody, null)).toBe(false);
  });
});

describe("Meta permission aliases", () => {
  it("accepts both legacy and current Instagram messaging permission names", () => {
    expect(
      hasPermissionRequirements(
        ["instagram_business_basic", "instagram_business_manage_messages", "pages_messaging"],
        INSTAGRAM_DM_PERMISSION_REQUIREMENTS,
      ),
    ).toBe(true);

    expect(
      hasPermissionRequirements(["instagram_basic", "instagram_manage_messages", "pages_messaging"], INSTAGRAM_DM_PERMISSION_REQUIREMENTS),
    ).toBe(true);

    expect(missingPermissionLabels(["instagram_business_basic"], INSTAGRAM_DM_PERMISSION_REQUIREMENTS)).toEqual([
      "instagram_manage_messages",
      "pages_messaging",
    ]);
  });
});

describe("Meta permission discovery", () => {
  it("merges user permission data with page token scopes from debug_token", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);

      if (requestUrl.includes("/me/permissions")) {
        return Response.json({
          data: [
            { permission: "pages_show_list", status: "granted" },
            { permission: "pages_read_engagement", status: "declined" },
          ],
        });
      }

      if (requestUrl.includes("/debug_token")) {
        return Response.json({
          data: {
            scopes: ["pages_messaging", "pages_manage_metadata", "pages_show_list"],
          },
        });
      }

      return Response.json({}, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getGrantedPermissions("page-token")).resolves.toEqual([
      "pages_manage_metadata",
      "pages_messaging",
      "pages_show_list",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns token diagnostics without exposing the token", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);

      if (requestUrl.includes("/me/permissions")) {
        return Response.json({
          data: [{ permission: "pages_show_list", status: "granted" }],
        });
      }

      if (requestUrl.includes("/debug_token")) {
        return Response.json({
          data: {
            is_valid: true,
            type: "PAGE",
            expires_at: 1_800_000_000,
            scopes: ["pages_messaging", "pages_manage_metadata"],
          },
        });
      }

      return Response.json({}, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(inspectMetaAccessToken("page-token")).resolves.toEqual({
      permissions: ["pages_manage_metadata", "pages_messaging", "pages_show_list"],
      expiresAt: "2027-01-15T08:00:00.000Z",
      isValid: true,
      tokenType: "PAGE",
      sources: {
        mePermissions: true,
        debugToken: true,
      },
    });
  });

  it("verifies the current app subscription before marking a webhook as subscribed", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);

      if (requestUrl.includes("/page-1/subscribed_apps") && init?.method === "POST") {
        return Response.json({ success: true });
      }

      if (requestUrl.includes("/page-1/subscribed_apps")) {
        return Response.json({
          data: [
            {
              id: "test-whatsapp-app",
              subscribed_fields: ["messages", "messaging_postbacks", "message_deliveries"],
            },
          ],
        });
      }

      return Response.json({}, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(subscribePageToWebhook("page-1", "page-token")).resolves.toBe(true);
  });

  it("does not mark webhook as subscribed when Meta does not list the current app", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);

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

    await expect(subscribePageToWebhook("page-1", "page-token")).resolves.toBe(false);
  });
});

describe("Meta redirect URI guard", () => {
  it("accepts the canonical app origin", () => {
    expect(
      getMetaRedirectUriStatus({
        currentOrigin: "https://kallem.vercel.app",
        configuredAppUrl: "https://kallem.vercel.app",
      }),
    ).toEqual({
      currentRedirectUri: "https://kallem.vercel.app/connect",
      expectedRedirectUri: "https://kallem.vercel.app/connect",
      isValid: true,
    });
  });

  it("returns an actionable mismatch message before OAuth starts", () => {
    const status = getMetaRedirectUriStatus({
      currentOrigin: "https://preview-kallem.vercel.app",
      configuredAppUrl: "https://kallem.vercel.app",
    });

    expect(status.isValid).toBe(false);
    expect(buildMetaRedirectUriMismatchMessage(status)).toContain("https://preview-kallem.vercel.app/connect");
  });
});

describe("Instagram page link guidance", () => {
  it("blocks Instagram setup when the selected Page has no linked Instagram Business account", () => {
    expect(getInstagramPageLinkIssue({ instagram_business_account: null })).toBe(INSTAGRAM_PAGE_LINK_REQUIRED_MESSAGE);
    expect(getInstagramPageLinkIssue({ instagram_business_account: { id: "ig-1" } })).toBeNull();
  });
});
