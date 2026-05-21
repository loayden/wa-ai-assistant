// FILE: src/components/ui/textarea.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Textarea shares input styling for large prompt and business context
 * fields while allowing stable resize behavior.
 */
import * as React from "react";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ className, ...props }, ref) => (
    <TextareaAutosize
      ref={ref}
      minRows={4}
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-wa-gray-100 bg-wa-gray-50 px-3 py-2.5 text-body-sm text-wa-gray-800 transition-colors duration-150 placeholder:text-wa-gray-400 focus-visible:border-[1.5px] focus-visible:border-wa-blue-600 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 disabled:cursor-not-allowed disabled:bg-wa-gray-100 disabled:text-wa-gray-400 aria-[invalid=true]:border-wa-error aria-[invalid=true]:bg-wa-error-bg sm:min-h-28 sm:px-4 sm:py-3 sm:text-body",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
