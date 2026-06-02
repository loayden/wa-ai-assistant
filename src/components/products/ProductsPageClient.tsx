"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Product setup is card-based and mobile-first because owners need a
 * menu/catalog manager that is faster than a spreadsheet on a phone.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Package, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiData } from "@/lib/api/client";
import { translateError } from "@/lib/errors/translateError";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  price: number;
  priceEGP: number;
  category: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type ProductsResponse = {
  products: Product[];
};

type ProductMutationResponse = {
  product: Product;
};

type ProductForm = {
  name: string;
  nameEn: string;
  description: string;
  priceEGP: string;
  category: string;
  isAvailable: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  nameEn: "",
  description: "",
  priceEGP: "",
  category: "",
  isAvailable: true,
};

type ProductFormErrors = Partial<Record<keyof ProductForm, string>>;

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value);
}

function buildPayload(form: ProductForm) {
  return {
    name: form.name.trim(),
    nameEn: form.nameEn.trim() || null,
    description: form.description.trim() || null,
    priceEGP: Number(form.priceEGP),
    category: form.category.trim() || null,
    isAvailable: form.isAvailable,
  };
}

function validateProductForm(form: ProductForm): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const price = Number(form.priceEGP);

  if (!form.name.trim()) {
    errors.name = "اكتب اسم المنتج.";
  }

  if (!form.priceEGP.trim() || !Number.isFinite(price) || price <= 0) {
    errors.priceEGP = "اكتب سعراً صحيحاً أكبر من صفر.";
  }

  return errors;
}

export function ProductsPageClient() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiData<ProductsResponse>("/api/products"),
  });
  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data?.products]);
  const availableCount = useMemo(() => products.filter((product) => product.isAvailable).length, [products]);
  const groupedProducts = useMemo(() => {
    return products.reduce<Record<string, Product[]>>((groups, product) => {
      const category = product.category || "بدون فئة";
      groups[category] = [...(groups[category] ?? []), product];
      return groups;
    }, {});
  }, [products]);

  const saveMutation = useMutation({
    mutationFn: (payload: ProductForm) => {
      const request = {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(buildPayload(payload)),
      };
      return apiData<ProductMutationResponse>(editingId ? `/api/products/${editingId}` : "/api/products", request);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setFormErrors({});
      setEditingId(null);
      toast.success("تم حفظ المنتج");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error("تعذر حفظ المنتج", {
        description: translateError(error, "حاول مرة أخرى."),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (productId: string) => apiData(`/api/products/${productId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم حذف المنتج");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error("تعذر حذف المنتج", {
        description: translateError(error, "حاول مرة أخرى."),
      });
    },
  });
  const availabilityMutation = useMutation({
    mutationFn: ({ isAvailable, productId }: { productId: string; isAvailable: boolean }) =>
      apiData<ProductMutationResponse>(`/api/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable }),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error("تعذر تحديث حالة المنتج", {
        description: translateError(error, "حاول مرة أخرى."),
      });
    },
  });

  function updateForm<Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      nameEn: product.nameEn ?? "",
      description: product.description ?? "",
      priceEGP: String(product.priceEGP),
      category: product.category ?? "",
      isAvailable: product.isAvailable,
    });
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-5 px-3 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-8" dir="rtl">
      <section className="overflow-hidden rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:rounded-[28px]">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#ffffff_0%,#f6f8ff_100%)] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">المنتجات</p>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[46px]">قائمة المنتجات</h1>
            <p className="mt-3 max-w-[720px] text-body-sm leading-7 text-wa-gray-600 sm:text-body-lg">
              أضف منتجاتك وأسعارك حتى يستطيع المساعد الرد على أسئلة الأسعار وتسجيل الطلبات من محادثات السوشيال.
            </p>
          </div>
          <div className="rounded-2xl border border-wa-gray-100 bg-white p-4">
            <p className="text-label font-semibold uppercase tracking-widest text-wa-gray-400">المنتجات المتاحة</p>
            <p className="mt-1 text-[34px] font-semibold text-wa-gray-900">{availableCount.toLocaleString("ar-EG")}</p>
            <p className="mt-1 text-body-sm text-wa-gray-600">من {products.length.toLocaleString("ar-EG")} منتج محفوظ.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <form
          noValidate
          className="rounded-[24px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const errors = validateProductForm(form);

            if (Object.keys(errors).length > 0) {
              setFormErrors(errors);
              return;
            }

            saveMutation.mutate(form);
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
              <Plus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-body-lg font-semibold text-wa-gray-900">{editingId ? "تعديل المنتج" : "إضافة منتج"}</h2>
              <p className="text-body-sm text-wa-gray-500">البيانات دي هتستخدم في ردود AI.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">اسم المنتج</span>
              <Input
                aria-invalid={Boolean(formErrors.name)}
                hasError={Boolean(formErrors.name)}
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="مثال: وجبة شاورما كبيرة"
              />
              <FieldError>{formErrors.name}</FieldError>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-body-sm font-semibold text-wa-gray-800">السعر بالجنيه</span>
                <Input
                  aria-invalid={Boolean(formErrors.priceEGP)}
                  hasError={Boolean(formErrors.priceEGP)}
                  inputMode="decimal"
                  min="1"
                  type="number"
                  value={form.priceEGP}
                  onChange={(event) => updateForm("priceEGP", event.target.value)}
                  placeholder="120"
                />
                <FieldError>{formErrors.priceEGP}</FieldError>
              </label>
              <label className="space-y-2">
                <span className="text-body-sm font-semibold text-wa-gray-800">الفئة</span>
                <Input value={form.category} onChange={(event) => updateForm("category", event.target.value)} placeholder="وجبات / مشروبات" />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">اسم إنجليزي اختياري</span>
              <Input value={form.nameEn} onChange={(event) => updateForm("nameEn", event.target.value)} placeholder="Large shawarma meal" dir="ltr" />
            </label>
            <label className="space-y-2">
              <span className="text-body-sm font-semibold text-wa-gray-800">وصف مختصر</span>
              <Textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="اكتب أي تفاصيل مهمة عن المنتج."
                className="min-h-[96px]"
              />
            </label>
            <label className="flex min-h-12 items-center justify-between rounded-2xl border border-wa-gray-100 bg-wa-gray-50 px-3">
              <span className="text-body-sm font-semibold text-wa-gray-800">متاح للبيع</span>
              <input
                checked={form.isAvailable}
                className="size-5 accent-wa-blue-600"
                type="checkbox"
                onChange={(event) => updateForm("isAvailable", event.target.checked)}
              />
            </label>
            <div className="flex gap-2">
              <Button className="flex-1 rounded-full" isLoading={saveMutation.isPending} type="submit">
                {editingId ? "حفظ التعديل" : "إضافة المنتج"}
              </Button>
              {editingId ? (
                <Button
                  className="rounded-full"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setFormErrors({});
                  }}
                >
                  إلغاء
                </Button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="rounded-[24px] border border-wa-gray-100 bg-white shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px]">
          <div className="flex items-center justify-between gap-3 border-b border-wa-gray-100 p-4 sm:p-5">
            <div>
              <h2 className="text-body-lg font-semibold text-wa-gray-900">المنتجات المحفوظة</h2>
              <p className="mt-1 text-body-sm text-wa-gray-500">رتّب منتجاتك بالفئات وخلي غير المتاح متوقف.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: ["products"] })}>
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {productsQuery.isLoading ? (
            <div className="space-y-3 p-4 sm:p-5">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-wa-blue-50">
                <Package className="size-7 text-wa-blue-600" aria-hidden="true" />
              </div>
              <p className="mt-4 text-h3 font-semibold text-wa-gray-900">أضف أول منتج</p>
              <p className="mt-2 text-body-sm leading-6 text-wa-gray-600">بعد إضافة المنتجات، سيقدر المساعد يفهم الطلبات ويحسب الإجمالي تلقائياً.</p>
            </div>
          ) : (
            <div className="space-y-5 p-4 sm:p-5">
              {Object.entries(groupedProducts).map(([category, items]) => (
                <div key={category}>
                  <p className="mb-2 text-label font-semibold uppercase tracking-widest text-wa-gray-400">{category}</p>
                  <div className="space-y-2.5">
                    {items.map((product) => (
                      <article key={product.id} className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3 sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-body font-semibold text-wa-gray-900">{product.name}</h3>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label font-semibold",
                                  product.isAvailable ? "bg-wa-success-bg text-wa-success" : "bg-wa-gray-100 text-wa-gray-500",
                                )}
                              >
                                {product.isAvailable ? <CheckCircle2 className="size-3" aria-hidden="true" /> : null}
                                {product.isAvailable ? "متاح" : "متوقف"}
                              </span>
                            </div>
                            <p className="mt-1 text-body-sm text-wa-gray-600">{formatPrice(product.priceEGP)} جنيه</p>
                            {product.description ? <p className="mt-2 line-clamp-2 text-body-sm leading-6 text-wa-gray-500">{product.description}</p> : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(product)}>
                              تعديل
                            </Button>
                            <Button
                              size="sm"
                              variant={product.isAvailable ? "secondary" : "outline"}
                              onClick={() => availabilityMutation.mutate({ productId: product.id, isAvailable: !product.isAvailable })}
                            >
                              {product.isAvailable ? "إيقاف" : "تشغيل"}
                            </Button>
                            <Button size="sm" variant="outline" aria-label={`حذف ${product.name}`} onClick={() => deleteMutation.mutate(product.id)}>
                              <Trash2 className="size-4" aria-hidden="true" />
                              <span className="sr-only">حذف {product.name}</span>
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
