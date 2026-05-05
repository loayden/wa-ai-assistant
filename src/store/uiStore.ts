// FILE: src/store/uiStore.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: UI state is separated from server data so sidebar visibility and
 * theme preference never invalidate business-data queries.
 */
"use client";

import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";

type UiStoreState = {
  sidebarOpen: boolean;
  theme: ThemePreference;
  toggleSidebar: () => void;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
};

export const useUiStore = create<UiStoreState>((set) => ({
  sidebarOpen: false,
  theme: "system",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => set({ theme }),
}));
