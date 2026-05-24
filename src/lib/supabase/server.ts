// FILE: src/lib/supabase/server.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Server clients are request-scoped because Supabase SSR reads and
 * refreshes auth cookies for the current request.
 */
import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { appEnv } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(appEnv.NEXT_PUBLIC_SUPABASE_URL, appEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          logger.debug("supabase.server", "Cookie write skipped outside a mutable response context.", { error });
        }
      },
    },
  });
}

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.warn("supabase.server", "Unable to resolve authenticated user.", { error });
    return null;
  }

  return user;
}

export const createServerSupabaseClient = createClient;
