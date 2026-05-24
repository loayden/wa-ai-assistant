// FILE: src/lib/api/client.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Client components use one fetch wrapper so TanStack Query and forms
 * unwrap API envelopes and surface HTTP errors consistently.
 */
import type { ApiResponse } from "@/types/api";

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly meta?: Record<string, unknown>;

  constructor(message: string, status: number, meta?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.meta = meta;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new ApiClientError(payload.error ?? "فشل الطلب. حاول مرة أخرى.", response.status, payload.meta);
  }

  return payload;
}

export async function apiData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiRequest<T>(path, init);

  if (response.data === undefined) {
    throw new ApiClientError("لم يرجع الخادم بيانات كافية.", 500);
  }

  return response.data;
}
