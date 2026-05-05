// FILE: src/store/authStore.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Auth state is persisted only in sessionStorage so browser refreshes
 * keep local UI coherent without extending the user's session beyond Supabase.
 */
"use client";

import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthStoreState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isLoading: false,
        }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth: () =>
        set({
          user: null,
          session: null,
          isLoading: false,
        }),
    }),
    {
      name: "wa-ai-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    },
  ),
);
