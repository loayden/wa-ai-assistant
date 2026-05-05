// FILE: src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/*
 * [ROLE: ARCHITECT]
 * Decision: shadcn/ui components expect a shared `cn` helper that merges
 * conditional classes and resolves Tailwind conflicts deterministically.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
