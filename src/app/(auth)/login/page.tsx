// FILE: src/app/(auth)/login/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Login page delegates behavior to the tested form component and
 * keeps route-level markup minimal.
 */
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[420px] w-full max-w-md" />}>
      <LoginForm />
    </Suspense>
  );
}
