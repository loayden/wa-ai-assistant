// FILE: src/components/shared/AuthProvider.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: AuthProvider exposes the Phase 9 auth hook through context for any
 * component that still consumes contextual session state.
 */
import { createContext, useMemo } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { useAuth } from "@/hooks/useAuth";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
});

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session, user, isLoading } = useAuth();

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
    }),
    [isLoading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
