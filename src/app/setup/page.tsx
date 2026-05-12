// FILE: src/app/setup/page.tsx

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: `/setup` is a friendly alias for the WhatsApp setup surface so
 * onboarding can link to one obvious route while preserving protected routing.
 */
import { redirect } from "next/navigation";

export default function SetupPage() {
  redirect("/whatsapp");
}
