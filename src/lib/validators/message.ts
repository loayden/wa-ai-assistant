// FILE: src/lib/validators/message.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Inbound webhook validation requires Meta's entry/changes/value
 * nesting and known WhatsApp message variants, while nested message payload
 * objects remain forward-compatible with optional Meta fields.
 */
import { z } from "zod";

const whatsappIdSchema = z.string().min(1).max(512);
const phoneNumberSchema = z.string().min(1).max(32);
const timestampSchema = z.string().regex(/^\d+$/, "Timestamp must be a Unix timestamp string.");

const webhookErrorSchema = z
  .object({
    code: z.number().int(),
    title: z.string().min(1),
    message: z.string().optional(),
    href: z.string().url().optional(),
    error_data: z
      .object({
        details: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const contextSchema = z
  .object({
    from: phoneNumberSchema.optional(),
    id: whatsappIdSchema.optional(),
    forwarded: z.boolean().optional(),
    frequently_forwarded: z.boolean().optional(),
  })
  .passthrough();

const mediaPayloadSchema = z
  .object({
    id: whatsappIdSchema,
    mime_type: z.string().min(1).optional(),
    sha256: z.string().min(1).optional(),
    caption: z.string().optional(),
    filename: z.string().optional(),
  })
  .passthrough();

const baseMessageSchema = z.object({
  from: phoneNumberSchema,
  id: whatsappIdSchema,
  timestamp: timestampSchema,
  context: contextSchema.optional(),
  errors: z.array(webhookErrorSchema).optional(),
});

const textMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("text"),
    text: z
      .object({
        body: z.string().min(1).max(4096),
      })
      .passthrough(),
  })
  .passthrough();

const imageMessageSchema = baseMessageSchema.extend({ type: z.literal("image"), image: mediaPayloadSchema }).passthrough();
const audioMessageSchema = baseMessageSchema.extend({ type: z.literal("audio"), audio: mediaPayloadSchema }).passthrough();
const videoMessageSchema = baseMessageSchema.extend({ type: z.literal("video"), video: mediaPayloadSchema }).passthrough();
const documentMessageSchema = baseMessageSchema
  .extend({ type: z.literal("document"), document: mediaPayloadSchema })
  .passthrough();
const stickerMessageSchema = baseMessageSchema
  .extend({ type: z.literal("sticker"), sticker: mediaPayloadSchema })
  .passthrough();

const locationMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("location"),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const contactsMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("contacts"),
    contacts: z.array(z.record(z.unknown())).min(1),
  })
  .passthrough();

const buttonMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("button"),
    button: z
      .object({
        text: z.string().min(1),
        payload: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

const interactiveMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("interactive"),
    interactive: z
      .object({
        type: z.string().min(1),
        button_reply: z
          .object({
            id: whatsappIdSchema,
            title: z.string().min(1),
          })
          .passthrough()
          .optional(),
        list_reply: z
          .object({
            id: whatsappIdSchema,
            title: z.string().min(1),
            description: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

const orderMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("order"),
    order: z
      .object({
        catalog_id: whatsappIdSchema,
        product_items: z.array(z.record(z.unknown())).min(1),
        text: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const reactionMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("reaction"),
    reaction: z
      .object({
        message_id: whatsappIdSchema,
        emoji: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const systemMessageSchema = baseMessageSchema
  .extend({
    type: z.literal("system"),
    system: z.record(z.unknown()),
  })
  .passthrough();

const whatsappMessageSchema = z.discriminatedUnion("type", [
  textMessageSchema,
  imageMessageSchema,
  audioMessageSchema,
  videoMessageSchema,
  documentMessageSchema,
  stickerMessageSchema,
  locationMessageSchema,
  contactsMessageSchema,
  buttonMessageSchema,
  interactiveMessageSchema,
  orderMessageSchema,
  reactionMessageSchema,
  systemMessageSchema,
]);

const contactSchema = z
  .object({
    profile: z
      .object({
        name: z.string().min(1),
      })
      .passthrough(),
    wa_id: phoneNumberSchema,
  })
  .passthrough();

const metadataSchema = z
  .object({
    display_phone_number: z.string().min(1).max(32),
    phone_number_id: z.string().min(1).max(32),
  })
  .strict();

const webhookValueSchema = z
  .object({
    messaging_product: z.literal("whatsapp"),
    metadata: metadataSchema,
    contacts: z.array(contactSchema).optional(),
    messages: z.array(whatsappMessageSchema).min(1),
    errors: z.array(webhookErrorSchema).optional(),
  })
  .strict();

const webhookChangeSchema = z
  .object({
    field: z.literal("messages"),
    value: webhookValueSchema,
  })
  .strict();

const webhookEntrySchema = z
  .object({
    id: whatsappIdSchema,
    changes: z.array(webhookChangeSchema).min(1),
  })
  .strict();

export const inboundWebhookSchema = z
  .object({
    object: z.literal("whatsapp_business_account"),
    entry: z.array(webhookEntrySchema).min(1),
  })
  .strict();

export type InboundWebhookInput = z.infer<typeof inboundWebhookSchema>;
export type InboundWhatsAppMessage = z.infer<typeof whatsappMessageSchema>;
