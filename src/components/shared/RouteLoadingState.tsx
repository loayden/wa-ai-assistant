import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div className="kallem-workspace-page space-y-4 p-2 sm:p-4" aria-busy="true" aria-label="جارٍ فتح الصفحة">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white/78 p-5 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <div className="space-y-4">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-full max-w-[520px] rounded-2xl sm:h-12" />
          <Skeleton className="h-4 w-full max-w-[680px] rounded-full" />
        </div>
      </section>
      <section className={compact ? "grid gap-4" : "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]"}>
        <Skeleton className="h-[260px] rounded-[28px]" />
        <Skeleton className="h-[360px] rounded-[28px]" />
      </section>
    </div>
  );
}
