// FILE: src/lib/admin/page-guard.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Admin pages check the role themselves instead of relying only
 * on the layout, so a layout refactor can never expose cross-tenant data.
 */
import "server-only";

import { redirect } from "next/navigation";

import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/api/auth";

export async function requireAdminPage(next = "/admin") {
  try {
    return await requireAdminUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect(`/login?next=${next}`);
    }

    if (error instanceof ForbiddenError) {
      redirect("/dashboard");
    }

    throw error;
  }
}
