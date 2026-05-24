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
  const [messageText, setMessageText] = useState("مرحباً، هل أنتم متاحون اليوم؟");
  const [responseText, setResponseText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    if (!phoneNumberId) {
      setError("اربط رقم واتساب الاختباري قبل إرسال رسالة تجربة.");
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
                    profile: { name: "عميل اختبار" },
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

      setResponseText(firstResult?.aiReplyText ?? `تمت معالجة الويبهوك بالحالة ${firstResult?.status ?? "غير معروفة"}.`);
      onSent?.();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "فشل إرسال رسالة الاختبار.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إرسال رسالة اختبار</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mock-customer-phone">رقم العميل</Label>
            <Input
              id="mock-customer-phone"
              value={customerPhoneNumber}
              onChange={(event) => setCustomerPhoneNumber(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mock-phone-number-id">معرّف رقم واتساب</Label>
            <Input id="mock-phone-number-id" disabled value={phoneNumberId ?? "اربط واتساب الاختباري أولاً"} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mock-message-text">نص الرسالة</Label>
          <Textarea
            id="mock-message-text"
            rows={4}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
          />
        </div>
        <Button disabled={isSending || !messageText.trim()} onClick={handleSend} type="button">
          <SendHorizontal className="size-4" aria-hidden="true" />
          {isSending ? "جار الإرسال..." : "إرسال"}
        </Button>
        {error ? (
          <Alert>
            <AlertTitle>فشل اختبار الإرسال</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {responseText ? (
          <Alert>
            <AlertTitle>تم توليد رد المساعد</AlertTitle>
            <AlertDescription>{responseText}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
