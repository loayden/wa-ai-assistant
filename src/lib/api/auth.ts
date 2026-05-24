// FILE: src/lib/api/auth.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Route handlers must derive tenancy from verified Supabase server
 * auth, then synchronize a local Prisma user row for tenant-owned data.
 */
import "server-only";

import { PlanTier, Prisma, SubscriptionStatus } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma/client";
import { getUser } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to access this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function getOptionalMetadataString(user: SupabaseUser, key: string): string | undefined {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export async function requireAuthenticatedUser(): Promise<SupabaseUser> {
  const user = await getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

const appUserSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  planTier: true,
  paymentCustomerId: true,
  paymentSubscriptionId: true,
  subscriptionStatus: true,
  monthlyReplyCount: true,
  replyCountResetAt: true,
  isAdmin: true,
  onboardingCompleted: true,
  trialEndsAt: true,
  trialUsed: true,
  paidAt: true,
  usageAlert80SentAt: true,
  usageAlert100SentAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type PersistedAppUser = Prisma.UserGetPayload<{ select: typeof appUserSelect }>;

export type AppUser = PersistedAppUser & {
  isAdmin: boolean;
  onboardingCompleted: boolean;
  trialEndsAt: Date | null;
  trialUsed: boolean;
  paidAt: Date | null;
  usageAlert80SentAt: Date | null;
  usageAlert100SentAt: Date | null;
};

function isConfiguredAdminEmail(email: string): boolean {
  return process.env.ADMIN_EMAIL?.toLowerCase().trim() === email.toLowerCase().trim();
}

function withSchemaFallbacks(user: PersistedAppUser): AppUser {
  return {
    ...user,
    isAdmin: user.isAdmin || isConfiguredAdminEmail(user.email),
  };
}

export async function ensureAppUser(supabaseUser: SupabaseUser): Promise<AppUser> {
  if (!supabaseUser.email) {
    logger.warn("api.auth", "Authenticated Supabase user is missing email.", { userId: supabaseUser.id });
    throw new UnauthorizedError("Authenticated user must have an email address.");
  }

  const fullName = getOptionalMetadataString(supabaseUser, "full_name") ?? null;
  const avatarUrl = getOptionalMetadataString(supabaseUser, "avatar_url") ?? null;

  await prisma.$executeRaw`
    INSERT INTO "users" (
      "id",
      "email",
      "full_name",
      "avatar_url",
      "plan_tier",
      "subscription_status",
      "updated_at"
    )
    VALUES (
      ${supabaseUser.id}::uuid,
      ${supabaseUser.email},
      ${fullName},
      ${avatarUrl},
      ${PlanTier.PRO}::"PlanTier",
      ${SubscriptionStatus.ACTIVE}::"SubscriptionStatus",
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE SET
      "email" = EXCLUDED."email",
      "full_name" = EXCLUDED."full_name",
      "avatar_url" = EXCLUDED."avatar_url",
      "updated_at" = CURRENT_TIMESTAMP
  `;

  const user = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
    select: appUserSelect,
  });

  if (!user) {
    logger.error("api.auth", "Failed to load app user after synchronization.", { userId: supabaseUser.id });
    throw new UnauthorizedError("Unable to load the local user profile.");
  }

  return withSchemaFallbacks(user);
}

export async function requireAppUser(): Promise<AppUser> {
  const supabaseUser = await requireAuthenticatedUser();
  return ensureAppUser(supabaseUser);
}

export async function requireAdminUser(): Promise<AppUser> {
  const user = await requireAppUser();

  if (!user.isAdmin) {
    throw new ForbiddenError("Admin access required.");
  }

  return user;
}
