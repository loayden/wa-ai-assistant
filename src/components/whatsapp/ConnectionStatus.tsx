// FILE: src/components/whatsapp/ConnectionStatus.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Connected state exposes only masked credentials while keeping
 * operational controls for auto-reply, webhook setup, and disconnect.
 */
"use client";

import { Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type WhatsAppConnectionSummary = {
  id: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessTokenMasked: string;
  displayName: string | null;
  isActive: boolean;
  isVerified: boolean;
};

type ConnectionStatusProps = {
  connection: WhatsAppConnectionSummary;
  webhookUrl: string;
  autoReplyEnabled: boolean;
  isUpdating: boolean;
  onToggleAutoReply: (enabled: boolean) => void;
  onDisconnect: () => void;
};

export function ConnectionStatus({
  connection,
  webhookUrl,
  onDisconnect,
}: ConnectionStatusProps) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-body font-medium text-wa-gray-900">{connection.displayName ?? "WhatsApp connected"}</p>
            <p className="mt-1 text-body-sm text-wa-gray-600">Your assistant is connected to this number.</p>
          </div>
          <StatusBadge label={connection.isVerified ? "Verified" : "Pending"} variant={connection.isVerified ? "active" : "paused"} />
        </div>
        <div className="space-y-3 rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-4">
          <div>
            <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">Phone number</p>
            <p className="mt-1 font-mono text-mono text-wa-gray-800">{connection.phoneNumberId}</p>
          </div>
          <div>
            <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">Connection</p>
            <p className="mt-1 text-body-sm text-wa-gray-600">{connection.isActive ? "Active and ready" : "Inactive"}</p>
          </div>
        </div>
        <details className="rounded-xl border border-wa-gray-100 bg-white p-5">
          <summary className="cursor-pointer text-body-sm font-medium text-wa-blue-600">Advanced settings</summary>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">Business account</p>
              <p className="mt-1 font-mono text-mono text-wa-gray-800">{connection.businessAccountId}</p>
            </div>
            <div>
              <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">Access token</p>
              <p className="mt-1 font-mono text-mono text-wa-gray-800">{connection.accessTokenMasked}</p>
            </div>
            <div className="space-y-2">
              <p className="text-label font-medium uppercase tracking-widest text-wa-gray-400">Webhook URL</p>
              <div className="flex gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-wa-gray-100 bg-wa-gray-50 px-3 py-3 font-mono text-mono text-wa-gray-600">
                  {webhookUrl}
                </code>
                <Button
                  aria-label="Copy webhook URL"
                  size="icon"
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(webhookUrl)}
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <Button className="w-full" variant="destructive" onClick={onDisconnect}>
              <Trash2 className="size-4" aria-hidden="true" />
              Disconnect
            </Button>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
