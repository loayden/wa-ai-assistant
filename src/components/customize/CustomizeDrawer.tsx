// FILE: src/components/customize/CustomizeDrawer.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Settings collapse into one drawer so routine assistant changes are
 * reachable from the dashboard without exposing a separate settings workspace.
 */
import { Lock } from "lucide-react";

import { ToneSelector, type ToneValue } from "@/components/ai/ToneSelector";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface CustomizeDrawerValues {
  tone: ToneValue;
  businessName: string;
  businessContext: string;
  language: string;
  fallbackMessage: string;
  systemPrompt: string;
  largeTextEnabled: boolean;
}

export interface CustomizeDrawerProps {
  open: boolean;
  values: CustomizeDrawerValues;
  canEditCustomPrompt: boolean;
  dirty?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onChange: (values: Partial<CustomizeDrawerValues>) => void;
  onSave: () => void;
  onBilling: () => void;
  onSignOut: () => void;
}

export function CustomizeDrawer({
  canEditCustomPrompt,
  dirty = false,
  isSaving = false,
  onBilling,
  onChange,
  onClose,
  onSave,
  onSignOut,
  open,
  values,
}: CustomizeDrawerProps) {
  return (
    <BottomSheet open={open} title="تخصيص المساعد" onClose={onClose}>
      <div className="space-y-4 pb-24 sm:space-y-6">
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:p-5">
          <div>
            <h3 className="text-body font-medium text-wa-gray-800">أسلوب الرد</h3>
            <p className="mt-1 text-body-sm text-wa-gray-600">اختاري نبرة المساعد أثناء الرد على العملاء.</p>
          </div>
          <ToneSelector value={values.tone} onChange={(tone) => onChange({ tone })} />
        </section>
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:space-y-4 sm:p-5">
          <div>
            <h3 className="text-body font-medium text-wa-gray-800">معلومات النشاط</h3>
            <p className="mt-1 text-body-sm text-wa-gray-600">هذه التفاصيل تجعل ردود kallem أدق وأقرب لطريقة عملك.</p>
          </div>
          <Input value={values.businessName} placeholder="اسم النشاط التجاري" onChange={(event) => onChange({ businessName: event.target.value })} />
          <Textarea
            maxLength={300}
            placeholder="اكتبي باختصار ماذا تبيعين أو كيف تساعدين العملاء"
            value={values.businessContext}
            onChange={(event) => onChange({ businessContext: event.target.value })}
          />
          <p className="text-right text-body-sm text-wa-gray-400">{values.businessContext.length}/300</p>
          <Select value={values.language} onChange={(event) => onChange({ language: event.target.value })}>
            <option value="ar">العربية</option>
            <option value="en">الإنجليزية</option>
            <option value="fr">الفرنسية</option>
            <option value="es">الإسبانية</option>
          </Select>
          <Input value={values.fallbackMessage} placeholder="رسالة عند عدم معرفة الإجابة" onChange={(event) => onChange({ fallbackMessage: event.target.value })} />
        </section>
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:p-5">
          <div>
            <h3 className="text-body font-medium text-wa-gray-800">تعليمات متقدمة</h3>
            <p className="mt-1 text-body-sm text-wa-gray-600">استخدميها فقط لو محتاجة تحكّم أدق في ما يقوله المساعد أو يتجنبه.</p>
          </div>
          {canEditCustomPrompt ? (
            <>
              <Textarea
                className="min-h-36"
                maxLength={2000}
                value={values.systemPrompt}
                onChange={(event) => onChange({ systemPrompt: event.target.value })}
              />
              <p className="text-right text-body-sm text-wa-gray-400">{values.systemPrompt.length}/2000</p>
            </>
          ) : (
              <div className="rounded-xl border border-wa-gray-100 bg-wa-gray-50 p-4 sm:p-5">
                <Lock className="mb-3 size-5 text-wa-gray-400" aria-hidden="true" />
                <h4 className="text-body font-medium text-wa-gray-900">تعليمات خاصة للمساعد</h4>
                <p className="mt-1 text-body-sm text-wa-gray-600">اكتبي للمساعد بوضوح كيف يتصرف، ماذا يقول، وماذا يتجنب.</p>
                <Button className="mt-4 w-full" onClick={onBilling}>ترقية الخطة</Button>
              </div>
          )}
        </section>
        <section className="space-y-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:p-5">
          <Button className="w-full" variant="outline" onClick={onBilling}>عرض الفوترة</Button>
          <Button className="w-full text-wa-error" variant="ghost" onClick={onSignOut}>تسجيل الخروج</Button>
        </section>
      </div>
      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-wa-gray-100 bg-white p-4 sm:p-5">
          <Button className="mx-auto w-full max-w-[480px]" isLoading={isSaving} onClick={onSave}>حفظ التغييرات</Button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
