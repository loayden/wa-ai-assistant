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
  metadata: Record<string, unknown> | null;
  status: MessageStatus;
  aiReplyText: string | null;
  aiModelUsed: string | null;
  aiTokensUsed: number | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  handoffActive?: boolean;
  handoffAt?: string | null;
  resolvedAt?: string | null;
  rating?: number | null;
  ratingRequestedAt?: string | null;
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
  isAdmin: boolean;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  monthlyReplyCount: number;
  onboardingCompleted: boolean;
  trialEndsAt: string | null;
  trialUsed: boolean;
  paidAt: string | null;
  usageAlert80SentAt: string | null;
  usageAlert100SentAt: string | null;
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
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  offHoursMessage: string;
  timezone: string;
  csatEnabled: boolean;
  notificationPrefs: {
    angry: boolean;
    lead: boolean;
    handoff: boolean;
    daily_summary: boolean;
    weekly_report: boolean;
    ai_failed: boolean;
  };
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

export type KnowledgeType = "text" | "faq" | "hours";

export type KnowledgeEntryResponse = {
  id: string;
  userId: string;
  type: KnowledgeType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeEntriesResponse = {
  entries: KnowledgeEntryResponse[];
};

export type KnowledgeEntryMutationResponse = {
  entry: KnowledgeEntryResponse;
};

export type DeleteKnowledgeEntryResponse = {
  deleted: boolean;
};

export type AssistantTestResponse = GenerateAiReplyResponse & {
  onboardingCompleted: boolean;
};

export type OnboardingUpdateResponse = {
  onboardingCompleted: boolean;
};

export type LeadStatus = "new" | "contacted" | "converted" | "dismissed";

export type LeadChannel = "whatsapp" | "instagram";

export type LeadResponse = {
  id: string;
  userId: string;
  messageId: string | null;
  connectionId: string | null;
  customerPhone: string;
  customerPhoneMasked: string;
  customerName: string | null;
  interest: string;
  channel: LeadChannel;
  status: LeadStatus;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadsResponse = {
  leads: LeadResponse[];
};

export type LeadMutationResponse = {
  lead: LeadResponse;
};

export type ConversationHandoffResponse = {
  handoff: {
    id?: string;
    active: boolean;
    handoffAt?: string | null;
    resumedAt?: string | null;
    resolvedAt?: string | null;
    rating?: number | null;
    ratingRequestedAt?: string | null;
  };
};

export type ConversationResolveResponse = {
  resolved: boolean;
  ratingRequested: boolean;
  handoff: {
    id: string;
    active: boolean;
    resolvedAt: string | null;
    rating: number | null;
    ratingRequestedAt: string | null;
  };
};

export type ConversationReplyResponse = {
  messageSent: boolean;
  message: MessageResponse;
};

export type AnalyticsSummaryResponse = {
  totalReplies: number;
  totalConversations: number;
  handoffs: number;
  leadsDetected: number;
  busiestHour: number | null;
  busiestDay: string | null;
  dailyReplies: Array<{ date: string; count: number }>;
  channelSplit: { whatsapp: number; instagram: number };
  averageRating: number | null;
  ratingCount: number;
  planTier: PlanTier;
};

export type MessageTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type MessageTemplateStatus = "draft" | "pending" | "approved" | "rejected";

export type MessageTemplateLanguage = "ar" | "en";

export type MessageTemplateResponse = {
  id: string;
  userId: string;
  connectionId: string | null;
  name: string;
  displayName: string;
  category: MessageTemplateCategory;
  language: MessageTemplateLanguage;
  headerText: string | null;
  bodyText: string;
  footerText: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  metaTemplateId: string | null;
  status: MessageTemplateStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageTemplatesResponse = {
  templates: MessageTemplateResponse[];
};

export type MessageTemplateMutationResponse = {
  template: MessageTemplateResponse;
};

export type MessageTemplateSendResponse = {
  messageSent: boolean;
  providerMessageId: string | null;
};

export type BroadcastStatus = "draft" | "sending" | "completed" | "failed";

export type BroadcastRecipientResponse = {
  id: string;
  phone: string;
  name: string | null;
  status: "pending" | "sent" | "failed";
  errorMessage: string | null;
  sentAt: string | null;
};

export type BroadcastResponse = {
  id: string;
  userId: string;
  connectionId: string | null;
  templateId: string | null;
  name: string;
  parameters: string[];
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: BroadcastStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  template: MessageTemplateResponse | null;
  recipients: BroadcastRecipientResponse[];
};

export type BroadcastsResponse = {
  broadcasts: BroadcastResponse[];
};

export type BroadcastMutationResponse = {
  broadcast: BroadcastResponse;
};

export type BroadcastSendResponse = {
  sent: number;
  failed: number;
};

export type BroadcastProcessResponse = {
  activeBroadcasts: number;
  processedRecipients: number;
  completedBroadcasts: number;
};

export type BroadcastStatusResponse = {
  status: BroadcastStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
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
