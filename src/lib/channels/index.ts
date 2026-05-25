import type { ChannelAdapter, MessagingChannel } from "@/lib/channels/types";
import { instagramAdapter } from "@/lib/channels/adapters/instagram";
import { messengerAdapter } from "@/lib/channels/adapters/messenger";
import { whatsappAdapter } from "@/lib/channels/adapters/whatsapp";

const adapters: Record<MessagingChannel, ChannelAdapter> = {
  instagram: instagramAdapter,
  messenger: messengerAdapter,
  whatsapp: whatsappAdapter,
};

export function getAdapter(channel: MessagingChannel): ChannelAdapter {
  return adapters[channel];
}

export * from "@/lib/channels/types";
