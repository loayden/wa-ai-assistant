"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Orders render as mobile cards rather than a table so owners can
 * confirm, collect payment, and update customers from a phone quickly.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiData } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type OrderStatus = "new" | "confirmed" | "preparing" | "delivered" | "cancelled";

type OrderItem = {
  product_id?: string;
  name?: string;
  qty?: number;
  unit_price?: number;
};

type Order = {
  id: string;
  customerPhone: string;
  customerName: string | null;
  customerAddress: string | null;
  items: unknown;
  subtotal: number;
  subtotalEGP: number;
  status: OrderStatus;
  notes: string | null;
  paymentLink: string | null;
  paymentLinkSentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrdersResponse = {
  orders: Order[];
};

const statusFilters: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "new", label: "جديد" },
  { value: "confirmed", label: "مؤكد" },
  { value: "preparing", label: "جاري التحضير" },
  { value: "delivered", label: "تم التسليم" },
  { value: "cancelled", label: "ملغي" },
];

const statusLabels: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  preparing: "جاري التحضير",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const nextActions: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  new: { status: "confirmed", label: "تأكيد" },
  confirmed: { status: "preparing", label: "جاهز / في الطريق" },
  preparing: { status: "delivered", label: "تم التسليم" },
};

function statusTone(status: OrderStatus) {
  if (status === "delivered") return "bg-wa-success-bg text-wa-success";
  if (status === "cancelled") return "bg-wa-gray-100 text-wa-gray-500";
  if (status === "preparing") return "bg-wa-warning-bg text-wa-warning";
  if (status === "confirmed") return "bg-wa-blue-50 text-wa-blue-700";
  return "bg-red-50 text-red-700";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value);
}

function normalizeItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item): item is OrderItem => Boolean(item) && typeof item === "object");
}

export function OrdersPageClient() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const ordersQuery = useQuery({
    queryKey: ["orders", filter],
    queryFn: () => apiData<OrdersResponse>(filter === "all" ? "/api/orders" : `/api/orders?status=${filter}`),
  });
  const orders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data?.orders]);
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter((order) => new Date(order.createdAt).toDateString() === today && order.status !== "cancelled")
      .reduce((total, order) => total + order.subtotalEGP, 0);
  }, [orders]);
  const newOrders = orders.filter((order) => order.status === "new").length;
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiData(`/api/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success("تم تحديث الطلب");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      toast.error("تعذر تحديث الطلب", {
        description: error instanceof Error ? error.message : "حاول مرة أخرى.",
      });
    },
  });
  const paymentMutation = useMutation({
    mutationFn: (orderId: string) => apiData(`/api/orders/${orderId}/payment-link`, { method: "POST" }),
    onSuccess: () => {
      toast.success("تم إرسال رابط الدفع للعميل");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => {
      toast.error("تعذر إرسال رابط الدفع", {
        description: error instanceof Error ? error.message : "راجع إعدادات Paymob وواتساب.",
      });
    },
  });

  return (
    <div className="mx-auto max-w-[1120px] space-y-5 px-3 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-8" dir="rtl">
      <section className="overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[28px]">
        <div className="grid gap-4 bg-[linear-gradient(135deg,#ffffff_0%,#f6f8ff_100%)] p-5 sm:grid-cols-3 sm:p-8">
          <div className="sm:col-span-2">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الطلبات</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[46px]">الطلبات</h1>
            <p className="mt-3 max-w-[700px] text-body-sm leading-7 text-wa-gray-600 sm:text-body-lg">
              تابع الطلبات القادمة من واتساب، حدّث حالة العميل، وأرسل رابط دفع من نفس المكان.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-1">
            <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">طلبات جديدة</p>
              <p className="mt-1 text-[34px] font-semibold text-wa-gray-900">{newOrders.toLocaleString("ar-EG")}</p>
            </div>
            <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
              <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">إيراد اليوم</p>
              <p className="mt-1 text-[28px] font-semibold text-wa-gray-900">{formatMoney(todayRevenue)} جنيه</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
        <div className="border-b border-wa-gray-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {statusFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    "min-h-10 shrink-0 rounded-full border px-3 text-body-sm font-semibold transition sm:min-h-11 sm:px-4",
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
            <Button size="sm" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: ["orders"] })}>
              <RefreshCw className="size-4" aria-hidden="true" />
              تحديث
            </Button>
          </div>
        </div>

        {ordersQuery.isLoading ? (
          <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-56 rounded-3xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-wa-blue-50">
              <ShoppingBag className="size-7 text-wa-blue-600" aria-hidden="true" />
            </div>
            <p className="mt-4 text-h3 font-semibold text-wa-gray-900">لا توجد طلبات بعد</p>
            <p className="mx-auto mt-2 max-w-[520px] text-body-sm leading-6 text-wa-gray-600">
              عندما يطلب العميل منتجاً بوضوح، سيظهر الطلب هنا مع الإجمالي وحالة الدفع.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
            {orders.map((order, index) => {
              const action = nextActions[order.status];
              const items = normalizeItems(order.items);

              return (
                <article key={order.id} className="rounded-[24px] border border-wa-gray-100 bg-wa-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">طلب #{String(index + 1).padStart(3, "0")}</p>
                      <h2 className="mt-1 text-body-lg font-semibold text-wa-gray-900">{order.customerName || order.customerPhone}</h2>
                      <p className="mt-1 text-body-sm text-wa-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-label font-semibold", statusTone(order.status))}>
                      {statusLabels[order.status]}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-wa-gray-100 bg-white p-3">
                    {items.length > 0 ? (
                      <ul className="space-y-2">
                        {items.map((item, itemIndex) => (
                          <li key={`${order.id}-${itemIndex}`} className="flex items-start justify-between gap-3 text-body-sm text-wa-gray-700">
                            <span>{item.name || "منتج"}</span>
                            <span className="shrink-0 font-semibold">x{item.qty ?? 1}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-body-sm text-wa-gray-500">تفاصيل المنتجات محفوظة في الطلب.</p>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-wa-gray-100 pt-3">
                      <span className="text-body-sm text-wa-gray-500">الإجمالي</span>
                      <span className="text-body-lg font-semibold text-wa-gray-900">{formatMoney(order.subtotalEGP)} جنيه</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {order.paidAt ? (
                      <span className="rounded-full bg-wa-success-bg px-3 py-1 text-body-sm font-semibold text-wa-success">تم الدفع</span>
                    ) : order.paymentLinkSentAt ? (
                      <span className="rounded-full bg-wa-warning-bg px-3 py-1 text-body-sm font-semibold text-wa-warning">في انتظار الدفع</span>
                    ) : (
                      <span className="rounded-full bg-wa-gray-100 px-3 py-1 text-body-sm font-semibold text-wa-gray-500">لم يرسل الدفع</span>
                    )}
                    {action ? (
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: action.status })}
                      >
                        {action.label}
                      </Button>
                    ) : null}
                    {order.status !== "cancelled" && !order.paidAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={paymentMutation.isPending}
                        onClick={() => paymentMutation.mutate(order.id)}
                      >
                        <CreditCard className="size-4" aria-hidden="true" />
                        إرسال رابط دفع
                      </Button>
                    ) : null}
                    {order.status !== "cancelled" && order.status !== "delivered" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })}
                      >
                        إلغاء
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
