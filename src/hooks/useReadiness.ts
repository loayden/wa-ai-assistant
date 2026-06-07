"use client";

import { useQuery } from "@tanstack/react-query";

import { apiData } from "@/lib/api/client";
import type { LaunchReadinessResponse, ReadinessMode } from "@/types/api";

export const readinessQueryKey = (mode: ReadinessMode = "full") => ["readiness", mode] as const;

export function useLaunchReadiness(mode: ReadinessMode = "full", enabled = true) {
  return useQuery({
    queryKey: readinessQueryKey(mode),
    queryFn: () => apiData<LaunchReadinessResponse>(`/api/readiness/check?mode=${mode}`),
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
