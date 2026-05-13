// FILE: src/types/database.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Database types are re-exported from Prisma so app code and tests
 * stay aligned with generated model contracts instead of hand-written shapes.
 */
import type {
  Message as PrismaMessage,
  SubscriptionEvent as PrismaSubscriptionEvent,
  User as PrismaUser,
  UserSettings as PrismaUserSettings,
  WhatsAppConnection as PrismaWhatsAppConnection,
  Prisma,
} from "@prisma/client";

export type User = PrismaUser;
export type WhatsAppConnection = PrismaWhatsAppConnection;
export type Message = PrismaMessage;
export type UserSettings = PrismaUserSettings;
export type SubscriptionEvent = PrismaSubscriptionEvent;

export type MessageWithConnection = Prisma.MessageGetPayload<{
  include: {
    connection: {
      select: {
        id: true;
        displayName: true;
        phoneNumberId: true;
      };
    };
  };
}>;

export type SafeWhatsAppConnection = Omit<WhatsAppConnection, "accessToken" | "ownerPhoneNumber"> & {
  accessTokenMasked: string;
  ownerPhoneNumberMasked: string | null;
};

export type DatabaseRecord = User | WhatsAppConnection | Message | UserSettings | SubscriptionEvent;
