// FILE: src/lib/utils/html.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: One shared HTML escaper for every place user-controlled text is
 * interpolated into email HTML or other HTML contexts.
 */

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[char] ?? char;
  });
}
