"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Correction = {
  id: string;
  originalCustomerMessage: string;
  wrongAiReply: string;
  correctReply: string;
  createdAt: string;
};

async function fetchCorrections() {
  const response = await fetch("/api/corrections", { cache: "no-store" });
  const payload = (await response.json()) as { success: boolean; data?: { corrections: Correction[] }; error?: string };

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || "تعذر تحميل تصحيحات المساعد.");
  }

  return payload.data.corrections;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CorrectionsPageClient() {
  const queryClient = useQueryClient();
  const correctionsQuery = useQuery({
    queryKey: ["ai-corrections"],
    queryFn: fetchCorrections,
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/corrections/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر حذف هذا التصحيح.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai-corrections"] });
    },
  });
  const corrections = correctionsQuery.data ?? [];

  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 sm:px-6">
      <div className="rounded-[28px] border border-wa-gray-100 bg-white p-5 shadow-[0_18px_60px_rgba(13,20,33,0.05)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-wa-blue-100 bg-wa-blue-50 px-3 py-1 text-label font-semibold text-wa-blue-700">
              <BookMarked className="size-4" aria-hidden="true" />
              تعلم مستمر
            </span>
            <div className="space-y-2">
              <h1 className="text-display-sm font-semibold tracking-[-0.02em] text-wa-gray-950 sm:text-display-md">
                تصحيحات المساعد
              </h1>
              <p className="max-w-2xl text-body-md leading-8 text-wa-gray-600">
                عندما تصحح رداً من صندوق الرسائل، يحفظ kallem المثال هنا حتى يتجنب المساعد نفس الخطأ في المستقبل.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-4 py-3 text-label font-semibold text-wa-gray-700">
            {corrections.length.toLocaleString("ar-EG")} تصحيح محفوظ
          </div>
        </div>
      </div>

      {correctionsQuery.isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-36 rounded-[24px]" />
          ))}
        </div>
      ) : deleteMutation.error ? (
        <div className="rounded-[18px] border border-red-100 bg-red-50 px-4 py-3 text-body-sm font-semibold text-red-700">
          {deleteMutation.error instanceof Error ? deleteMutation.error.message : "تعذر حذف التصحيح. حاول مرة أخرى."}
        </div>
      ) : corrections.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-wa-gray-200 bg-white p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
            <BookMarked className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-title-md font-semibold text-wa-gray-950">لا توجد تصحيحات بعد</h2>
          <p className="mx-auto mt-2 max-w-lg text-body-sm leading-7 text-wa-gray-600">
            افتح أي محادثة، واضغط تصحيح على رد AI غير مناسب. سيحفظ kallem النسخة الصحيحة هنا ويستخدمها في الردود القادمة.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {corrections.map((correction) => (
            <article key={correction.id} className="rounded-[24px] border border-wa-gray-100 bg-white p-5 shadow-[0_14px_44px_rgba(13,20,33,0.04)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-label font-semibold text-wa-gray-500">{formatDate(correction.createdAt)}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-full border-red-100 text-red-600 hover:bg-red-50"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(correction.id)}
                >
                  {deleteMutation.isPending ? <Loader2 className="me-2 size-4 animate-spin" /> : <Trash2 className="me-2 size-4" />}
                  حذف
                </Button>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl bg-wa-gray-50 p-4">
                  <p className="text-label font-semibold uppercase tracking-[0.16em] text-wa-gray-400">رسالة العميل</p>
                  <p className="mt-2 text-body-sm leading-7 text-wa-gray-800">{correction.originalCustomerMessage}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-label font-semibold uppercase tracking-[0.16em] text-red-500">الرد الخاطئ</p>
                  <p className="mt-2 text-body-sm leading-7 text-red-900">{correction.wrongAiReply}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-label font-semibold uppercase tracking-[0.16em] text-emerald-600">الرد الصحيح</p>
                  <p className="mt-2 text-body-sm leading-7 text-emerald-950">{correction.correctReply}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
