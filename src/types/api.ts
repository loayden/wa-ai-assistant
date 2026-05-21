// FILE: src/types/api.ts
/*
 * [ROLE: BACKEND ENGINEER + FRONTEND ENGINEER]
 * Decision: API route contracts are centralized so handlers, hooks, and tests
 * use the same envelope, pagination, and domain response shapes.
 */
import type { SafeWhatsAppConnection } from "@/types/database";
import type { PlanTier, SubscriptionStatus } from "@/types/subscription";

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  meta: PaginationMeta;
};

export type AuthUserResponse = {
  id: string;
  email: string;
  planTier?: PlanTier;
  subscriptionStatus?: SubscriptionStatus;
};

export type LoginResponse = {
  user: Required<Pick<AuthUserResponse, "id" | "email" | "planTier" | "subscriptionStatus">>;
};

export type SignupResponse = {
  user: Pick<AuthUserResponse, "id" | "email"> | null;
  requiresEmailVerification: boolean;
};

export type LogoutResponse = {
  signedOut: boolean;
};

export type ConnectionResponse = SafeWhatsAppConnection;

export type ConnectionsResponse = {
  connections: ConnectionResponse[];
};

export type CreateConnectionResponse = {
  connection: ConnectionResponse;
};

export type DeleteConnectionResponse = {
  deleted: boolean;
};

export type MessageDirection = "INBOUND" | "OUTBOUND";

export type MessageStatus = "RECEIVED" | "PROCESSING" | "REPLIED" | "FAILED" | "IGNORED";

export type MessageResponse = {
  id: string;
  userId: string;
  connectionId: string;
  waMessageId: string;
  direction: MessageDirection;
  fromNumber: string;
  toNumber: string;
  bodyText: string;
  mediaUrl: string | null;
  mediaType: string | null;
  status: MessageStatus;
  aiReplyText: string | null;
  aiModelUsed: string | null;
  aiTokensUsed: number | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  connection?: {
    id: string;
    displayName: string | null;
    phoneNumberId: string;
  };
};

export type MessagesResponse = PaginatedResponse<MessageResponse>;

export type SettingsUserResponse = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  monthlyReplyCount: number;
  replyCountResetAt: string;
  paymentCustomerId: string | null;
  paymentSubscriptionId: string | null;
};

export type UserSettingsResponse = {
  id: string;
  userId: string;
  systemPrompt: string;
  autoReplyEnabled: boolean;
  language: string;
  businessName: string | null;
  businessContext: string | null;
  fallbackMessage: string | null;
  maxReplyLength: number;
  createdAt: string;
  updatedAt: string;
};

export type SettingsResponse = {
  settings: UserSettingsResponse;
  user: SettingsUserResponse;
};

export type GenerateAiReplyResponse = {
  replyText: string;
  modelUsed: string;
  tokensUsed: number;
};

export type BillingRedirectResponse = {
  url: string;
};

export type WhatsAppWebhookProcessingResult = {
  waMessageId: string;
  status: MessageStatus | "DUPLICATE" | "NO_CONNECTION";
  aiReplyText?: string;
};

export type WhatsAppWebhookResponse = {
  processed: WhatsAppWebhookProcessingResult[];
};

export type HealthResponse = {
  status: "ok";
  timestamp: string;
  version: string;
};
