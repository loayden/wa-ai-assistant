// FILE: src/components/messages/MessageItem.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Each message row owns its expanded state so the inbox can reveal
 * full inbound and AI reply details without navigating away from the table.
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { MessageRecord } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

export type MessageListItem = MessageRecord;

type MessageItemProps = {
  message: MessageListItem;
};

function getStatusVariant(status: MessageListItem["status"]) {
  if (status === "REPLIED") {
    return "success" as const;
  }

  if (status === "FAILED") {
    return "destructive" as const;
  }

  if (status === "PROCESSING") {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function MessageItem({ message }: MessageItemProps) {
  const [expanded, setExpanded] = useState(false);
  const timestamp = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(message.createdAt));

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded((value) => !value)}>
        <TableCell className="w-10">
          <Button
            aria-label={expanded ? "Collapse message" : "Expand message"}
            className="size-8"
            size="icon"
            type="button"
            variant="ghost"
          >
            {expanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
          </Button>
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">{timestamp}</TableCell>
        <TableCell className="font-medium">{message.fromNumber}</TableCell>
        <TableCell>
          <span className="line-clamp-1">{message.bodyText}</span>
        </TableCell>
        <TableCell>
          <Badge variant={message.direction === "INBOUND" ? "default" : "secondary"}>{message.direction}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(message.status)}>{message.status}</Badge>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6}>
            <div className="grid gap-4 p-2 md:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Customer Message</p>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.bodyText}</p>
              </div>
              <div className={cn("rounded-lg border bg-background p-4", !message.aiReplyText && "text-muted-foreground")}>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">AI Reply</p>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.aiReplyText ?? "No AI reply recorded for this message."}</p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
