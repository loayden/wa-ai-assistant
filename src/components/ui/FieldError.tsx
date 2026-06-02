import type { ReactNode } from "react";

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) {
    return null;
  }

  return (
    <p id={id} className="text-body-sm font-medium text-wa-error">
      {children}
    </p>
  );
}
