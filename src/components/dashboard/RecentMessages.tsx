// FILE: src/components/dashboard/RecentMessages.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The dashboard keeps recent history dense and links to the full
 * inbox for detailed filtering and expansion.
 */
import Link from "next/link";

import { MessageListItem } from "@/components/messages/MessageItem";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type RecentMessagesProps = {
  messages: MessageListItem[];
};

export function RecentMessages({ messages }: RecentMessagesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Messages</CardTitle>
        <Link href="/messages" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No messages recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(message.createdAt))}
                  </TableCell>
                  <TableCell className="font-medium">{message.fromNumber}</TableCell>
                  <TableCell>
                    <span className="line-clamp-1">{message.bodyText}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={message.status === "REPLIED" ? "success" : "outline"}>{message.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
