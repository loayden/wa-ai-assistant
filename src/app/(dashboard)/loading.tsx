// FILE: src/app/(dashboard)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardRouteLoading() {
  return (
    <div className="kallem-workspace-page space-y-4" aria-busy="true" aria-label="جارٍ فتح الصفحة">
      <section className="workspace-hero rounded-[28px] border border-wa-gray-100 bg-white/74 p-4 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-10 w-full max-w-[560px] rounded-2xl sm:h-14" />
            <Skeleton className="h-4 w-full max-w-[680px] rounded-full" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-36 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>
          <Skeleton className="min-h-[140px] rounded-[24px]" />
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <Skeleton className="h-[420px] rounded-[28px]" />
        <Skeleton className="h-[520px] rounded-[28px]" />
        <Skeleton className="h-[420px] rounded-[28px]" />
      </section>
    </div>
  );
}
