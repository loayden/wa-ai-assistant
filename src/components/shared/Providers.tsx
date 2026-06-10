// FILE: src/components/shared/Providers.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Root providers are isolated in a client component so server layouts
 * can remain static while TanStack Query and auth subscriptions hydrate once.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Toaster } from "sonner";

import { MarketingEventTracker } from "@/components/marketing/MarketingEventTracker";
import { AuthProvider } from "@/components/shared/AuthProvider";
import { NavigationSpeedBoost } from "@/components/shared/NavigationSpeedBoost";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <NavigationSpeedBoost />
      <Suspense fallback={null}>
        <MarketingEventTracker />
      </Suspense>
      <Toaster
        closeButton
        position="top-center"
        richColors
        toastOptions={{
          classNames: {
            toast: "border-wa-gray-100 shadow-wa-2",
          },
        }}
      />
    </QueryClientProvider>
  );
}
