// FILE: src/app/api/auth/route.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: This exact `/api/auth` route dispatches body-based auth actions so
 * clients are not forced to use path-specific endpoints.
 */
import { handleAuthPost } from "@/lib/api/auth-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleAuthPost(request);
}
