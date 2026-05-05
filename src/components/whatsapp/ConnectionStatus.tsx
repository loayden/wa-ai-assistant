// FILE: src/components/whatsapp/ConnectionStatus.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Connected state exposes only masked credentials while keeping
 * operational controls for auto-reply, webhook setup, and disconnect.
 */
"use client";

import { Copy, Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  autoReplyEnabled,
  isUpdating,
  onToggleAutoReply,
  onDisconnect,
}: ConnectionStatusProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{connection.displayName ?? "WhatsApp Connection"}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Phone Number ID {connection.phoneNumberId}</p>
        </div>
        <Badge variant={connection.isVerified ? "success" : "warning"}>{connection.isVerified ? "Verified" : "Pending verification"}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Business Account ID</p>
            <p className="mt-1 text-sm">{connection.businessAccountId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Access Token</p>
            <p className="mt-1 text-sm">{connection.accessTokenMasked}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Connection</p>
            <Badge className="mt-1" variant={connection.isActive ? "success" : "secondary"}>
              {connection.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Power className="size-4 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Auto-reply</p>
              <p className="text-xs text-muted-foreground">Turn AI replies on or off for inbound messages.</p>
            </div>
          </div>
          <Switch
            checked={autoReplyEnabled}
            disabled={isUpdating}
            onChange={(event) => onToggleAutoReply(event.currentTarget.checked)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <div className="flex gap-2">
            <Input id="webhook-url" readOnly value={webhookUrl} />
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
        <Button variant="destructive" onClick={onDisconnect}>
          <Trash2 className="size-4" aria-hidden="true" />
          Disconnect
        </Button>
      </CardContent>
    </Card>
  );
}
