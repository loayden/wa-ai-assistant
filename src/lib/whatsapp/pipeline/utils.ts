import type { InboundWhatsAppMessage } from "@/lib/validators/message";

export function extractMessageBody(message: InboundWhatsAppMessage): string {
  switch (message.type) {
    case "text":
      return message.text.body;
    case "button":
      return message.button.text;
    case "interactive":
      return message.interactive.button_reply?.title ?? message.interactive.list_reply?.title ?? "Interactive reply";
    case "image":
      return message.image.caption ?? "[image message]";
    case "video":
      return message.video.caption ?? "[video message]";
    case "document":
      return message.document.caption ?? message.document.filename ?? "[document message]";
    case "audio":
      return "[audio message]";
    case "sticker":
      return "[sticker message]";
    case "location":
      return `Location: ${message.location.latitude}, ${message.location.longitude}`;
    case "contacts":
      return "[contact card message]";
    case "order":
      return message.order.text ?? "[order message]";
    case "reaction":
      return `Reaction ${message.reaction.emoji ?? ""} to ${message.reaction.message_id}`.trim();
    case "system":
      return "[system message]";
  }
}

export function extractMediaType(message: InboundWhatsAppMessage): string | undefined {
  return ["image", "video", "document", "audio", "sticker"].includes(message.type) ? message.type : undefined;
}

export function extractAudioMediaId(message: InboundWhatsAppMessage): string | null {
  return message.type === "audio" ? message.audio.id : null;
}

export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[char] ?? char;
  });
}
