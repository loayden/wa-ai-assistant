import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { instagramAdapter } from "@/lib/channels/adapters/instagram";
import { messengerAdapter } from "@/lib/channels/adapters/messenger";
import { INSTAGRAM_DM_PERMISSION_REQUIREMENTS, hasPermissionRequirements, missingPermissionLabels } from "@/lib/meta/permissions";
import { verifyMetaSignature } from "@/lib/meta/signature";
import { getGrantedPermissions } from "@/lib/meta/social";

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
});
