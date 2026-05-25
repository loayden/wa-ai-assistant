import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import { instagramAdapter } from "@/lib/channels/adapters/instagram";
import { messengerAdapter } from "@/lib/channels/adapters/messenger";
import { verifyMetaSignature } from "@/lib/meta/signature";

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
