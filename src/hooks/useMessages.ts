// FILE: src/hooks/useMessages.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Message reads use a single query-key factory so pagination and
 * filters dedupe correctly across dashboard and inbox surfaces.
 */
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api/client";
import type { MessageDirection, MessageResponse, MessageStatus } from "@/types/api";

export type MessageDirectionFilter = MessageDirection;
export type MessageStatusFilter = MessageStatus;

export type MessageRecord = MessageResponse & {
  connection?: MessageResponse["connection"] | null;
};

export type UseMessagesParams = {
  page?: number;
  limit?: number;
  direction?: MessageDirectionFilter;
  status?: MessageStatusFilter;
  connectionId?: string;
};

export const messagesQueryKey = (params: Required<Pick<UseMessagesParams, "page" | "limit">> & Omit<UseMessagesParams, "page" | "limit">) => [
  "messages",
  params,
] as const;

export function useMessages({ page = 1, limit = 20, connectionId, direction, status }: UseMessagesParams = {}) {
  const queryParams = useMemo(
    () => ({
      page,
      limit,
      connectionId,
      direction,
      status,
    }),
    [connectionId, direction, limit, page, status],
  );
  const query = useQuery({
    queryKey: messagesQueryKey(queryParams),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(queryParams.page),
        limit: String(queryParams.limit),
      });

      if (queryParams.direction) {
        params.set("direction", queryParams.direction);
      }

      if (queryParams.status) {
        params.set("status", queryParams.status);
      }

      if (queryParams.connectionId) {
        params.set("connectionId", queryParams.connectionId);
      }

      return apiRequest<MessageRecord[]>(`/api/messages?${params.toString()}`);
    },
  });
  const messages = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const total = Number(query.data?.meta?.total ?? 0);

  return {
    messages,
    total,
    page,
    limit,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
