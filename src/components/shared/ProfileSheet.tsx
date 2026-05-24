// FILE: src/components/shared/ProfileSheet.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Profile actions live in a sheet so account and billing controls are
 * available without returning to a sidebar or separate account route.
 */
import { ElderModeToggle } from "@/components/elder/ElderModeToggle";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useElderMode } from "@/hooks/useElderMode";
import type { PlanTier } from "@/types/subscription";

export interface ProfileSheetProps {
  open: boolean;
  userName?: string | null;
  userEmail?: string | null;
  planTier: PlanTier;
  onClose: () => void;
  onBilling?: () => void;
  onSignOut?: () => void;
}

export function ProfileSheet({ onBilling, onClose, onSignOut, open, planTier, userEmail, userName }: ProfileSheetProps) {
  const { enabled: elderEnabled, toggle: toggleElder } = useElderMode();

  return (
    <BottomSheet open={open} title="الحساب" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl border border-wa-gray-100 bg-white p-5">
          <p className="text-body font-medium text-wa-gray-900">{userName || "الحساب"}</p>
          <p className="mt-1 text-body-sm text-wa-gray-600">{userEmail || "تم تسجيل الدخول"}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <StatusBadge label={planTier} variant={planTier === "FREE" ? "free" : "pro"} />
            <p className="text-body-sm text-wa-gray-600">{planTier === "FREE" ? "بداية مجانية" : "الخطة المدفوعة مفعّلة"}</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-wa-gray-100 bg-white px-5 py-4">
          <div>
            <p className="text-body font-medium text-wa-gray-800">وضع النص الكبير</p>
            <p className="mt-0.5 text-body-sm text-wa-gray-400">نصوص وأزرار أكبر لتجربة قراءة أسهل</p>
          </div>
          <ElderModeToggle enabled={elderEnabled} onToggle={toggleElder} />
        </div>
        <Button className="w-full" variant="outline" onClick={onBilling}>عرض الفوترة</Button>
        <Button className="w-full text-wa-error" variant="ghost" onClick={onSignOut}>تسجيل الخروج</Button>
      </div>
    </BottomSheet>
  );
}
