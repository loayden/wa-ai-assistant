// FILE: src/app/(dashboard)/settings/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Settings are exposed as a form-first workspace because operators
 * return here repeatedly to adjust AI behavior.
 */
import { GeneralSettings } from "@/components/settings/GeneralSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure business context, language, reply limits, and prompt behavior.</p>
      </div>
      <GeneralSettings />
    </div>
  );
}
