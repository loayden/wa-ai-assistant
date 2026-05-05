// FILE: src/hooks/useSettings.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Settings reads and writes share one cache entry so form saves,
 * sidebar badges, billing, and dashboard usage remain synchronized.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiData } from "@/lib/api/client";
import type { UpdateSettingsInput } from "@/lib/validators/settings";
import type { SettingsResponse } from "@/types/api";

export type SettingsRecord = SettingsResponse["settings"];
export type SettingsUserSummary = SettingsResponse["user"];

export const settingsQueryKey = ["settings"] as const;

export function useSettings() {
  const query = useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => apiData<SettingsResponse>("/api/settings"),
  });

  return {
    settings: query.data?.settings ?? null,
    user: query.data?.user ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateSettingsInput) =>
      apiData<SettingsResponse>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKey });

      const previousSettings = queryClient.getQueryData<SettingsResponse>(settingsQueryKey);

      if (previousSettings) {
        queryClient.setQueryData<SettingsResponse>(settingsQueryKey, {
          ...previousSettings,
          settings: {
            ...previousSettings.settings,
            ...values,
          },
        });
      }

      return { previousSettings };
    },
    onError: (_error, _values, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsQueryKey, context.previousSettings);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey });
    },
  });
}
