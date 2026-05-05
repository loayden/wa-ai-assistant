// FILE: src/components/messages/MockMessageSender.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Mock mode exercises the real webhook route with a Meta-compatible
 * payload so frontend tests follow the same processing path as production.
 */
"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";

type MockMessageSenderProps = {
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  onSent?: () => void;
};

type MockWebhookResponse = {
  processed: Array<{
    waMessageId: string;
    status: string;
    aiReplyText?: string;
  }>;
};

export function MockMessageSender({ phoneNumberId, displayPhoneNumber = "15555550199", onSent }: MockMessageSenderProps) {
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState("15555550100");
  const [messageText, setMessageText] = useState("Hi, are you open today?");
  const [responseText, setResponseText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    if (!phoneNumberId) {
      setError("Connect a mock WhatsApp number before sending a test message.");
      return;
    }

    setIsSending(true);
    setError(null);
    setResponseText(null);

    const waMessageId = `mock-${Date.now()}`;
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "mock-business-account",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: displayPhoneNumber,
                  phone_number_id: phoneNumberId,
                },
                contacts: [
                  {
                    profile: { name: "Mock Customer" },
                    wa_id: customerPhoneNumber,
                  },
                ],
                messages: [
                  {
                    from: customerPhoneNumber,
                    id: waMessageId,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: messageText },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    try {
      const data = await apiData<MockWebhookResponse>("/api/webhooks/whatsapp", {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=mock",
        },
        body: JSON.stringify(payload),
      });
      const firstResult = data.processed[0];

      setResponseText(firstResult?.aiReplyText ?? `Webhook processed with status ${firstResult?.status ?? "UNKNOWN"}.`);
      onSent?.();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Mock message failed.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Test Message</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mock-customer-phone">Customer phone number</Label>
            <Input
              id="mock-customer-phone"
              value={customerPhoneNumber}
              onChange={(event) => setCustomerPhoneNumber(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mock-phone-number-id">Phone Number ID</Label>
            <Input id="mock-phone-number-id" disabled value={phoneNumberId ?? "Connect mock WhatsApp first"} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mock-message-text">Message text</Label>
          <Textarea
            id="mock-message-text"
            rows={4}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
          />
        </div>
        <Button disabled={isSending || !messageText.trim()} onClick={handleSend} type="button">
          <SendHorizontal className="size-4" aria-hidden="true" />
          {isSending ? "Sending..." : "Send"}
        </Button>
        {error ? (
          <Alert>
            <AlertTitle>Mock send failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {responseText ? (
          <Alert>
            <AlertTitle>AI reply generated</AlertTitle>
            <AlertDescription>{responseText}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
