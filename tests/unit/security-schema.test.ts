// FILE: tests/unit/security-schema.test.ts
/*
 * [ROLE: SECURITY ENGINEER]
 * Decision: Migration security expectations are checked statically so RLS is not
 * forgotten when adding new tenant-owned tables.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("security schema migrations", () => {
  it("enables RLS and owner-only reads for audit logs", () => {
    const migration = readFileSync(
      join(process.cwd(), "prisma/migrations/20260606152000_add_audit_logs/migration.sql"),
      "utf8",
    );

    expect(migration).toContain('ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "audit_logs_select_own"');
    expect(migration).toContain('(select auth.uid()) = "user_id"');
  });

  it("enables RLS for launch observability tables without exposing raw webhook payloads", () => {
    const migration = readFileSync(
      join(process.cwd(), "prisma/migrations/20260606165000_add_launch_observability_tables/migration.sql"),
      "utf8",
    );

    expect(migration).toContain('ALTER TABLE "ai_reply_traces" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "ai_reply_traces_select_own"');
    expect(migration).toContain('ALTER TABLE "readiness_snapshots" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "readiness_snapshots_select_own"');
    expect(migration).toContain('ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY');
    expect(migration).not.toContain('CREATE POLICY "webhook_events_select_own"');
  });
});
