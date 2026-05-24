// FILE: src/lib/validators/auth.ts
/*
 * [ROLE: BACKEND ENGINEER]
 * Decision: Auth inputs are normalized at the API boundary so Supabase receives
 * clean email values and password policy failures return deterministic errors.
 */
import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("اكتبي بريد إلكتروني صحيح.").max(254, "البريد طويل جداً.");

export const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون ٨ أحرف على الأقل.")
  .max(128, "كلمة المرور طويلة جداً.")
  .regex(/[A-Z]/, "كلمة المرور يجب أن تحتوي على حرف إنجليزي كبير واحد على الأقل.")
  .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.");

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(2, "اكتبي الاسم الكامل.").max(120, "الاسم طويل جداً."),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
