// FILE: src/app/(dashboard)/messages/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The messages route renders the operational inbox as the primary
 * screen, backed by the paginated API from Phase 7.
 */
import { MessageList } from "@/components/messages/MessageList";

export default function MessagesPage() {
  return <MessageList />;
}
