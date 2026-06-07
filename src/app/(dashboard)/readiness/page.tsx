import type { Metadata } from "next";

import { ReadinessPageClient } from "@/components/readiness/ReadinessPageClient";
import { getLaunchReadiness } from "@/lib/readiness/checks";
import { writeReadinessSnapshot } from "@/lib/readiness/snapshots";
import { getShellUser } from "@/lib/server/dashboard-bootstrap";

export const metadata: Metadata = {
  title: "جاهزية الإطلاق",
};

export const dynamic = "force-dynamic";

export default async function ReadinessPage() {
  const auth = await getShellUser();

  if (!auth) {
    return null;
  }

  const readiness = await getLaunchReadiness(auth.appUser.id, { mode: "full" });
  await writeReadinessSnapshot(auth.appUser.id, readiness);

  return <ReadinessPageClient initialReadiness={readiness} />;
}
