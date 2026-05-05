// FILE: src/lib/validators/resolver.ts
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: The project standardizes on Zod v3 schemas; this helper isolates
 * the resolver package's broad schema typing so forms stay strictly typed.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

export function strictZodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  return zodResolver(schema as never) as Resolver<TFieldValues>;
}
