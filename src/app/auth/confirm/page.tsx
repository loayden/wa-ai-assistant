import { Suspense } from "react";

import { AuthConfirmClient } from "@/components/auth/AuthConfirmClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[320px] w-full max-w-md" />}>
      <AuthConfirmClient />
    </Suspense>
  );
}
