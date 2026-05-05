// FILE: src/lib/supabase/client.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Browser code can only use public Supabase configuration, and
 * `createBrowserClient` already memoizes internally for client components.
 */
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireBrowserSupabaseConfig(): { supabaseUrl: string; supabaseAnonKey: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing browser Supabase environment variables.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createClient() {
  const config = requireBrowserSupabaseConfig();

  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey);
}

export const createBrowserSupabaseClient = createClient;
