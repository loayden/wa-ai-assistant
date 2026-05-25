// FILE: src/components/leads/LeadsPageClient.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Lead management stays lightweight and mobile-first: filter chips,
 * inline status changes, and CSV export without table chrome on small screens.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCcw, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ChannelIcon } from "@/components/icons/ChannelIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { InstagramCommentLeadResponse, LeadResponse, LeadStatus, LeadsResponse } from "@/types/api";

type LeadFilter = "all" | LeadStatus;
type ChannelFilter = "all" | "whatsapp" | "instagram" | "messenger";

const FILTERS: Array<{ value: LeadFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "converted", label: "تحوّل لعميل" },
  { value: "dismissed", label: "تجاهل" },
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  converted: "تحوّل لعميل",
  dismissed: "تجاهل",
};

const CHANNEL_FILTERS: Array<{ value: ChannelFilter; label: string }> = [
  { value: "all", label: "كل القنوات" },
  { value: "whatsapp", label: "واتساب" },
  { value: "instagram", label: "إنستجرام" },
  { value: "messenger", label: "ماسنجر" },
];

function channelLabel(channel: string) {
  if (channel === "instagram") return "إنستجرام";
  if (channel === "messenger") return "ماسنجر";
  return "واتساب";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(status: LeadStatus) {
  switch (status) {
    case "converted":
      return "bg-wa-success-bg text-wa-success";
    case "contacted":
      return "bg-wa-blue-50 text-wa-blue-700";
    case "dismissed":
      return "bg-wa-gray-100 text-wa-gray-500";
    default:
      return "bg-wa-warning-bg text-wa-warning";
  }
}

export function LeadsPageClient() {
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [instagramCommentLeads, setInstagramCommentLeads] = useState<InstagramCommentLeadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadLeads(nextFilter = filter, nextChannel = channelFilter) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (nextFilter !== "all") {
        params.set("status", nextFilter);
      }
      if (nextChannel !== "all") {
        params.set("channel", nextChannel);
      }

      const response = await apiData<LeadsResponse>(`/api/leads${params.toString() ? `?${params.toString()}` : ""}`);
      setLeads(response.leads);
      setInstagramCommentLeads(response.instagramCommentLeads ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "تعذر تحميل العملاء المحتملين.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeads(filter, channelFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, channelFilter]);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return leads;
    }

    return leads.filter((lead) =>
      [lead.customerPhone, lead.customerPhoneMasked, lead.externalId, lead.senderName, lead.interest, lead.channel, STATUS_LABELS[lead.status]]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [leads, search]);

  async function updateStatus(lead: LeadResponse, status: LeadStatus) {
    if (lead.status === status) {
      return;
    }

    const previous = leads;
    setUpdatingId(lead.id);
    setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, status } : item)));

    try {
      const response = await apiData<{ lead: LeadResponse }>(`/api/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setLeads((current) => current.map((item) => (item.id === lead.id ? response.lead : item)));
      toast.success("تم تحديث حالة العميل المحتمل");
    } catch (updateError) {
      setLeads(previous);
      toast.error("تعذر تحديث العميل المحتمل", {
        description: updateError instanceof Error ? updateError.message : "حاول مرة أخرى.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="relative mx-auto max-w-[1120px] px-3 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-10">
      <header className="mb-4 overflow-hidden rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:mb-5 sm:rounded-[28px]">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#ffffff_0%,#f6f8ff_100%)] p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <Link
              className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-wa-gray-100 bg-white px-3 text-body-sm font-semibold text-wa-gray-600 transition hover:bg-wa-gray-50 sm:min-h-10 sm:px-4"
              href="/dashboard"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              الرئيسية
            </Link>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">العملاء</p>
            <h1 className="mt-2 text-[29px] font-semibold leading-tight text-wa-gray-900 sm:text-[46px]">العملاء المحتملون</h1>
            <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg" dir="rtl">
              kallem يلتقط أسئلة الشراء والطلبات من المحادثات تلقائيًا حتى تعرف من يحتاج متابعة سريعة.
            </p>
          </div>
          <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">النتائج الظاهرة</p>
            <p className="mt-1 text-[34px] font-semibold text-wa-gray-900">{filteredLeads.length.toLocaleString("ar-EG")}</p>
            <p className="mt-1 text-body-sm text-wa-gray-600">بعد فلترة نية الشراء المكتشفة.</p>
          </div>
        </div>
      </header>

      <section className="rounded-[22px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
        <div className="border-b border-wa-gray-100 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-wa-gray-400 sm:left-4" aria-hidden="true" />
              <Input
                className="h-11 rounded-2xl bg-wa-gray-50 pl-10 sm:h-12 sm:pl-11"
                placeholder="ابحث بالرقم، الاهتمام، أو الحالة"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.assign("/api/leads/export")}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-wa-gray-200 px-3 text-body-sm font-semibold text-wa-gray-700 transition hover:bg-wa-gray-50 sm:min-h-11 sm:px-4"
              >
                <Download className="size-4" aria-hidden="true" />
                تصدير CSV
              </button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => void loadLeads(filter, channelFilter)}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                تحديث
              </Button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CHANNEL_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm font-semibold transition-colors sm:min-h-11 sm:px-4",
                  channelFilter === item.value
                    ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800"
                    : "border-wa-gray-100 bg-white text-wa-gray-600 hover:bg-wa-gray-50",
                )}
                onClick={() => setChannelFilter(item.value)}
              >
                {item.value !== "all" ? <ChannelIcon channel={item.value} className="size-4" /> : null}
                {item.label}
              </button>
            ))}
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-3 text-body-sm font-semibold transition-colors sm:min-h-11 sm:px-4",
                  filter === item.value
                    ? "border-wa-blue-600 bg-wa-blue-50 text-wa-blue-800"
                    : "border-wa-gray-100 bg-white text-wa-gray-600 hover:bg-wa-gray-50",
                )}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5 p-4 sm:p-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div>
        ) : error ? (
          <div className="p-6 text-center sm:p-10">
            <p className="text-h3 font-semibold text-wa-gray-900">تعذر تحميل العملاء المحتملين</p>
            <p className="mt-2 text-body-sm text-wa-gray-600">{error}</p>
            <Button className="mt-4 rounded-full" onClick={() => void loadLeads(filter, channelFilter)}>
              حاول مرة أخرى
            </Button>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-6 text-center sm:p-12" dir="rtl">
            <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-wa-blue-50">
              <UserPlus className="size-7 text-wa-blue-600" aria-hidden="true" />
            </div>
            <p className="mt-4 text-h3 font-semibold text-wa-gray-900">لم يتم اكتشاف عملاء محتملين بعد</p>
            <p className="mx-auto mt-2 max-w-[520px] text-body-sm leading-6 text-wa-gray-600">
              المساعد سيضيفهم تلقائيًا عند تحليل محادثات فيها طلب شراء، سعر، حجز، أو توفر خدمة.
            </p>
            <Link
              href="/messages"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-wa-gray-900 px-5 text-body-sm font-semibold text-white transition hover:bg-wa-gray-700"
            >
              فتح الرسائل
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-wa-gray-100">
            {filteredLeads.map((lead) => (
              <article key={lead.id} className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[170px_minmax(0,1fr)_140px_150px_170px] lg:items-center" dir="rtl">
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">العميل</p>
                  <p className="mt-1 text-body-sm font-semibold text-wa-gray-900">
                    {lead.channel === "whatsapp" ? lead.customerPhoneMasked : lead.senderName ?? lead.externalId ?? "عميل اجتماعي"}
                  </p>
                </div>
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">الاهتمام</p>
                  <p className="mt-1 text-body-sm leading-6 text-wa-gray-700">{lead.interest}</p>
                  {lead.source !== "chat" ? (
                    <span className="mt-2 inline-flex rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-700">
                      {lead.source === "instagram_comment" ? "تعليق إنستجرام" : lead.source}
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">القناة</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-wa-success-bg px-2.5 py-1 text-xs font-semibold text-wa-success">
                    <ChannelIcon channel={lead.channel} className="size-3" />
                    {channelLabel(lead.channel)}
                  </span>
                </div>
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">التاريخ</p>
                  <p className="mt-1 text-body-sm text-wa-gray-600">{formatDate(lead.detectedAt)}</p>
                </div>
                <div>
                  <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">الحالة</p>
                  <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-2">
                    <Select
                      className="h-10 rounded-xl bg-white text-xs sm:h-11"
                      disabled={updatingId === lead.id}
                      value={lead.status}
                      onChange={(event) => void updateStatus(lead, event.target.value as LeadStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <span className={cn("hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex", statusTone(lead.status))}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {instagramCommentLeads.length > 0 ? (
        <section className="mt-4 rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:mt-5 sm:rounded-[28px] sm:p-5" dir="rtl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-label font-semibold uppercase tracking-widest text-pink-600">Instagram</p>
              <h2 className="mt-1 text-h3 font-semibold text-wa-gray-900">تعليقات إنستجرام التي تحولت لفرص</h2>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
              {instagramCommentLeads.length.toLocaleString("ar-EG")} تعليق
            </span>
          </div>

          <div className="mt-4 divide-y divide-wa-gray-100">
            {instagramCommentLeads.map((comment) => (
              <article key={comment.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_150px_130px_140px] lg:items-center">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-body-sm font-semibold leading-6 text-wa-gray-900">{comment.commentText}</p>
                  <p className="mt-1 truncate text-xs text-wa-gray-500">
                    {comment.commenterName ?? comment.commenterId}
                    {comment.postCaption ? ` · ${comment.postCaption}` : ""}
                  </p>
                </div>
                <span className={cn("inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold", comment.isLead ? "bg-wa-success-bg text-wa-success" : "bg-wa-gray-100 text-wa-gray-500")}>
                  {comment.isLead ? "نية شراء" : "تعليق عادي"}
                </span>
                <span className={cn("inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold", comment.dmSent ? "bg-blue-50 text-blue-700" : "bg-wa-warning-bg text-wa-warning")}>
                  {comment.dmSent ? "تم إرسال DM" : "لم يتم إرسال DM"}
                </span>
                <time className="text-xs font-medium text-wa-gray-500">{formatDate(comment.createdAt)}</time>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
