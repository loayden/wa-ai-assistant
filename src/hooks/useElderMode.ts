// FILE: src/hooks/useElderMode.ts
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Elder mode lives in localStorage because it is a pure client-side
 * accessibility preference and should persist independently of auth state.
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "wa-elder-mode";

export function useElderMode() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === "true") {
      setEnabled(true);
      document.body.classList.add("elder-mode");
    }
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));

    if (next) {
      document.body.classList.add("elder-mode");
      return;
    }

    document.body.classList.remove("elder-mode");
  }

  return { enabled, toggle };
}
