// FILE: src/app/(dashboard)/messages/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The messages route renders the operational inbox as the primary
 * screen, backed by the paginated API from Phase 7.
 */
import { MessageList } from "@/components/messages/MessageList";

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Messages</h1>
        <p className="text-sm text-muted-foreground">Review inbound messages, outbound replies, and processing state.</p>
      </div>
      <MessageList />
    </div>
  );
}
