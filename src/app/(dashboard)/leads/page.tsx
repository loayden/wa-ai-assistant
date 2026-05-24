// FILE: src/app/(dashboard)/leads/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Leads get a dedicated operational page so owners can act on buying
 * intent without digging through the full inbox.
 */
import { LeadsPageClient } from "@/components/leads/LeadsPageClient";

export default function LeadsPage() {
  return <LeadsPageClient />;
}
