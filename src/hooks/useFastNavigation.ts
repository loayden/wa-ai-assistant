// FILE: src/hooks/useFastNavigation.ts
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Buttons that navigate with router.push need the same instant
 * feedback and route warmup as links.
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";

type PushOptions = {
  scroll?: boolean;
};

function announceNavigation(href: string) {
  window.dispatchEvent(new CustomEvent("kallem:navigation-start", { detail: { href } }));
}

export function useFastNavigation() {
  const router = useRouter();

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  const push = useCallback(
    (href: string, options?: PushOptions) => {
      prefetch(href);
      announceNavigation(href);
      router.push(href, options);
    },
    [prefetch, router],
  );

  return { prefetch, push };
}
