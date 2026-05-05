// FILE: src/components/whatsapp/WhatsAppPageClient.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: WhatsApp state is driven by connection and settings queries so the
 * setup page can switch between connect, connected, and mock test states.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MockMessageSender } from "@/components/messages/MockMessageSender";
import { ConnectForm } from "@/components/whatsapp/ConnectForm";
import { ConnectionStatus, type WhatsAppConnectionSummary } from "@/components/whatsapp/ConnectionStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { apiData } from "@/lib/api/client";

type ConnectionsResponse = {
  connections: WhatsAppConnectionSummary[];
};

type WhatsAppPageClientProps = {
  appUrl: string;
  mockMode: boolean;
};

export function WhatsAppPageClient({ appUrl, mockMode }: WhatsAppPageClientProps) {
  const queryClient = useQueryClient();
  const connectionsQuery = useQuery({
    queryKey: ["whatsapp-connections"],
    queryFn: () => apiData<ConnectionsResponse>("/api/whatsapp/connect"),
  });
  const settingsResult = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => apiData(`/api/whatsapp/connect?id=${connectionId}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] }),
  });

  if (connectionsQuery.isLoading || settingsResult.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (connectionsQuery.isError || settingsResult.error) {
    return (
      <Alert>
        <AlertTitle>WhatsApp settings unavailable</AlertTitle>
        <AlertDescription>Connection data could not be loaded. Refresh after checking your session.</AlertDescription>
      </Alert>
    );
  }

  if (!connectionsQuery.data || !settingsResult.settings) {
    return (
      <Alert>
        <AlertTitle>WhatsApp settings unavailable</AlertTitle>
        <AlertDescription>The connection response did not include usable data.</AlertDescription>
      </Alert>
    );
  }

  const connection = connectionsQuery.data.connections[0] ?? null;

  if (!connection) {
    return (
      <ConnectForm
        mockMode={mockMode}
        onConnected={() => {
          void queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {mockMode ? (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-950">
          <AlertTitle>Mock Mode Active</AlertTitle>
          <AlertDescription>No real WhatsApp messages will be sent from this environment.</AlertDescription>
        </Alert>
      ) : null}
      <ConnectionStatus
        connection={connection}
        webhookUrl={`${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`}
        autoReplyEnabled={settingsResult.settings.autoReplyEnabled}
        isUpdating={updateSettingsMutation.isPending}
        onToggleAutoReply={(enabled) => updateSettingsMutation.mutate({ autoReplyEnabled: enabled })}
        onDisconnect={() => {
          if (window.confirm("Disconnect this WhatsApp number and delete associated messages?")) {
            disconnectMutation.mutate(connection.id);
          }
        }}
      />
      {mockMode ? (
        <MockMessageSender
          phoneNumberId={connection.phoneNumberId}
          onSent={() => {
            void queryClient.invalidateQueries({ queryKey: ["messages"] });
          }}
        />
      ) : null}
    </div>
  );
}
