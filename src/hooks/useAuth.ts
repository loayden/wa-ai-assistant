// FILE: src/hooks/useAuth.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Supabase remains the source of truth for sessions; this hook only
 * mirrors auth changes into Zustand for client UI and route actions.
 */
"use client";

import { useCallback, useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const supabase = useMemo(() => createClient(), []);
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    let active = true;

    setLoading(true);

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      if (error) {
        clearAuth();
        return;
      }

      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [clearAuth, setLoading, setSession, supabase]);

  const signOut = useCallback(async () => {
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      throw error;
    }

    clearAuth();
  }, [clearAuth, setLoading, supabase]);

  return {
    user,
    session,
    signOut,
    isLoading,
  };
}
