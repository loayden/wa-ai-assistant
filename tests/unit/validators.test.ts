// FILE: tests/unit/validators.test.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Validator tests cover valid payloads, invalid payloads, and edge
 * bounds so API routes reject malformed data before business logic runs.
 */
import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "@/lib/validators/auth";
import { KNOWLEDGE_CONTENT_MAX_LENGTH, KNOWLEDGE_TITLE_MAX_LENGTH } from "@/lib/knowledge/constants";
import { inboundWebhookSchema } from "@/lib/validators/message";
import { BUSINESS_CONTEXT_MAX_LENGTH, updateSettingsSchema } from "@/lib/validators/settings";
import { createKnowledgeEntrySchema, updateKnowledgeEntrySchema } from "@/lib/validators/knowledge";
import { connectWhatsAppSchema, webhookVerifySchema } from "@/lib/validators/whatsapp";

const validWebhookPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "business-account",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15555550199",
              phone_number_id: "1234567890",
            },
            contacts: [
              {
                profile: { name: "Customer" },
                wa_id: "15555550100",
              },
            ],
            messages: [
              {
                from: "15555550100",
                id: "wamid.test",
                timestamp: "1710000000",
                type: "text",
                text: {
                  body: "Hello",
                },
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("auth validators", () => {
  it("accepts signup input and normalizes email", () => {
    const parsed = signupSchema.parse({
      email: "OWNER@EXAMPLE.COM ",
      password: "Password1",
      fullName: "Owner Name",
    });

    expect(parsed.email).toBe("owner@example.com");
  });

  it("rejects weak signup passwords", () => {
    expect(
      signupSchema.safeParse({
        email: "owner@example.com",
        password: "password",
        fullName: "Owner Name",
      }).success,
    ).toBe(false);
  });

  it("accepts login input", () => {
    expect(loginSchema.safeParse({ email: "owner@example.com", password: "anything" }).success).toBe(true);
  });
});

describe("settings validators", () => {
  it("accepts valid settings updates", () => {
    expect(
      updateSettingsSchema.safeParse({
        systemPrompt: "Reply politely.",
        autoReplyEnabled: true,
        language: "en-US",
        businessName: "Acme",
        businessContext: "x".repeat(BUSINESS_CONTEXT_MAX_LENGTH),
        maxReplyLength: 300,
      }).success,
    ).toBe(true);
  });

  it("rejects business context over the dashboard limit", () => {
    expect(updateSettingsSchema.safeParse({ businessContext: "x".repeat(BUSINESS_CONTEXT_MAX_LENGTH + 1) }).success).toBe(false);
  });

  it.each([49, 1001])("rejects maxReplyLength boundary %s", (maxReplyLength) => {
    expect(updateSettingsSchema.safeParse({ maxReplyLength }).success).toBe(false);
  });

  it("rejects empty settings updates", () => {
    expect(updateSettingsSchema.safeParse({}).success).toBe(false);
  });
});

describe("knowledge validators", () => {
  it("accepts FAQ questions up to the shared knowledge title limit", () => {
    expect(
      createKnowledgeEntrySchema.safeParse({
        type: "faq",
        title: "س".repeat(KNOWLEDGE_TITLE_MAX_LENGTH),
        content: "الإجابة واضحة.",
      }).success,
    ).toBe(true);
  });

  it("rejects FAQ questions over the shared knowledge title limit", () => {
    expect(
      createKnowledgeEntrySchema.safeParse({
        type: "faq",
        title: "س".repeat(KNOWLEDGE_TITLE_MAX_LENGTH + 1),
        content: "الإجابة واضحة.",
      }).success,
    ).toBe(false);
  });

  it("rejects knowledge content over the shared content limit", () => {
    expect(
      updateKnowledgeEntrySchema.safeParse({
        content: "x".repeat(KNOWLEDGE_CONTENT_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe("WhatsApp validators", () => {
  it("accepts valid connection input", () => {
    expect(
      connectWhatsAppSchema.safeParse({
        phoneNumberId: "1234567890",
        businessAccountId: "9876543210",
        accessToken: "x".repeat(32),
        displayName: "Support",
      }).success,
    ).toBe(true);
  });

  it("rejects non-numeric Meta ids", () => {
    expect(
      connectWhatsAppSchema.safeParse({
        phoneNumberId: "phone-id",
        businessAccountId: "9876543210",
        accessToken: "x".repeat(32),
      }).success,
    ).toBe(false);
  });

  it("accepts webhook verification query parameters", () => {
    expect(
      webhookVerifySchema.safeParse({
        "hub.mode": "subscribe",
        "hub.verify_token": "secret",
        "hub.challenge": "challenge-token",
      }).success,
    ).toBe(true);
  });

  it("validates inbound webhook payloads", () => {
    expect(inboundWebhookSchema.safeParse(validWebhookPayload).success).toBe(true);
  });

  it("rejects inbound webhook payloads without messages", () => {
    const invalidPayload = structuredClone(validWebhookPayload);
    invalidPayload.entry[0].changes[0].value.messages = [];

    expect(inboundWebhookSchema.safeParse(invalidPayload).success).toBe(false);
  });
});
