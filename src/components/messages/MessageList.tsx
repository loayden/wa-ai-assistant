// FILE: src/components/messages/MessageList.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The inbox uses server-side pagination and filters from the API,
 * with a lightweight client-side search for the currently loaded page.
 */
"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { MessageItem } from "@/components/messages/MessageItem";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMessages, type MessageDirectionFilter, type MessageStatusFilter } from "@/hooks/useMessages";

type DirectionOption = "ALL" | MessageDirectionFilter;
type StatusOption = "ALL" | MessageStatusFilter;

const STATUS_FILTERS: StatusOption[] = ["ALL", "RECEIVED", "PROCESSING", "REPLIED", "FAILED", "IGNORED"];

export function MessageList() {
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<DirectionOption>("ALL");
  const [status, setStatus] = useState<StatusOption>("ALL");
  const [search, setSearch] = useState("");
  const limit = 20;
  const messagesResult = useMessages({
    page,
    limit,
    direction: direction === "ALL" ? undefined : direction,
    status: status === "ALL" ? undefined : status,
  });
  const messages = messagesResult.messages;
  const total = messagesResult.total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filteredMessages = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return messages;
    }

    return messages.filter((message) =>
      [message.bodyText, message.aiReplyText, message.fromNumber, message.toNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [messages, search]);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Messages</CardTitle>
          <Button disabled variant="outline" type="button">
            <Download className="size-4" aria-hidden="true" />
            Export
          </Button>
          {/* [PLACEHOLDER - REASON: CSV export endpoint is scheduled for v2.] */}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="space-y-2">
            <Label htmlFor="message-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="message-search"
                className="pl-9"
                placeholder="Search loaded messages"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="direction-filter">Direction</Label>
            <Select
              id="direction-filter"
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value as DirectionOption);
                setPage(1);
              }}
            >
              <option value="ALL">All directions</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select
              id="status-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusOption);
                setPage(1);
              }}
            >
              {STATUS_FILTERS.map((statusFilter) => (
                <option key={statusFilter} value={statusFilter}>
                  {statusFilter === "ALL" ? "All statuses" : statusFilter}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {messagesResult.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : messagesResult.error ? (
          <Alert>
            <AlertTitle>Messages unavailable</AlertTitle>
            <AlertDescription>{messagesResult.error.message}</AlertDescription>
          </Alert>
        ) : filteredMessages.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No messages match the current filters.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Timestamp</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button disabled={page <= 1} variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  Previous
                </Button>
                <Button disabled={page >= totalPages} variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
