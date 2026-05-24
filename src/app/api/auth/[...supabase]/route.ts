// FILE: src/app/api/auth/[...supabase]/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Path-based auth actions support `/api/auth/login`, `/api/auth/signup`,
 * and `/api/auth/logout` while sharing the exact auth dispatcher.
 */
import { handleAuthPost } from "@/lib/api/auth-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ supabase: string[] }> }) {
  const params = await context.params;
  return handleAuthPost(request, params.supabase[0]);
}
