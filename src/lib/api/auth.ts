// FILE: src/lib/api/auth.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Route handlers must derive tenancy from verified Supabase server
 * auth, then synchronize a local Prisma user row for tenant-owned data.
 */
import "server-only";

import type { User as PrismaUser } from "@prisma/client";
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

export async function ensureAppUser(supabaseUser: SupabaseUser): Promise<PrismaUser> {
  if (!supabaseUser.email) {
    logger.warn("api.auth", "Authenticated Supabase user is missing email.", { userId: supabaseUser.id });
    throw new UnauthorizedError("Authenticated user must have an email address.");
  }

  return prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      email: supabaseUser.email,
      fullName: getOptionalMetadataString(supabaseUser, "full_name"),
      avatarUrl: getOptionalMetadataString(supabaseUser, "avatar_url"),
    },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email,
      fullName: getOptionalMetadataString(supabaseUser, "full_name"),
      avatarUrl: getOptionalMetadataString(supabaseUser, "avatar_url"),
    },
  });
}

export async function requireAppUser(): Promise<PrismaUser> {
  const supabaseUser = await requireAuthenticatedUser();
  return ensureAppUser(supabaseUser);
}
