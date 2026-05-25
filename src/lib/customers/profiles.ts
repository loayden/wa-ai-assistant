import type { Prisma } from "@prisma/client";

import type { MessagingChannel } from "@/lib/channels/types";
import { prisma } from "@/lib/prisma/client";

export async function getOrUpsertCustomerProfile(params: {
  userId: string;
  externalId: string;
  channel: MessagingChannel;
  name?: string | null;
  instagramUsername?: string | null;
}) {
  const where: Prisma.CustomerProfileWhereInput =
    params.channel === "whatsapp"
      ? { userId: params.userId, phone: params.externalId }
      : params.channel === "messenger"
        ? { userId: params.userId, messengerPsid: params.externalId }
        : { userId: params.userId, instagramIgsid: params.externalId };

  const existing = await prisma.customerProfile.findFirst({ where });

  if (existing) {
    return prisma.customerProfile.update({
      where: { id: existing.id },
      data: {
        lastContactAt: new Date(),
        ...(existing.name ? {} : { name: params.name ?? null }),
        ...(params.channel === "instagram" && params.instagramUsername ? { instagramUsername: params.instagramUsername } : {}),
      },
    });
  }

  return prisma.customerProfile.create({
    data: {
      userId: params.userId,
      phone: params.externalId,
      channel: params.channel,
      name: params.name ?? null,
      messengerPsid: params.channel === "messenger" ? params.externalId : null,
      instagramIgsid: params.channel === "instagram" ? params.externalId : null,
      instagramUsername: params.channel === "instagram" ? params.instagramUsername ?? null : null,
      firstContactAt: new Date(),
      lastContactAt: new Date(),
    },
  });
}

export async function mergeCustomerProfiles(params: {
  userId: string;
  primaryProfileId: string;
  secondaryProfileId: string;
}) {
  if (params.primaryProfileId === params.secondaryProfileId) {
    throw new Error("Cannot merge the same customer profile.");
  }

  const [primary, secondary] = await Promise.all([
    prisma.customerProfile.findFirst({
      where: { id: params.primaryProfileId, userId: params.userId },
    }),
    prisma.customerProfile.findFirst({
      where: { id: params.secondaryProfileId, userId: params.userId },
    }),
  ]);

  if (!primary || !secondary) {
    throw new Error("Customer profile not found.");
  }

  return prisma.customerProfile.update({
    where: { id: secondary.id },
    data: {
      linkedProfileId: primary.id,
      isMerged: true,
    },
  });
}
