// FILE: src/app/(dashboard)/analytics/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Analytics is intentionally simple and dependency-free so businesses
 * see impact without adding charting weight to the app.
 */
import { AnalyticsPageClient } from "@/components/analytics/AnalyticsPageClient";

export default function AnalyticsPage() {
  return <AnalyticsPageClient />;
}
