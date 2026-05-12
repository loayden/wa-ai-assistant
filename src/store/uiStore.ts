// FILE: src/store/uiStore.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: UI state is separated from server data so theme preference never
 * invalidates business-data queries.
 */
"use client";

import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";

type UiStoreState = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

export const useUiStore = create<UiStoreState>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));
