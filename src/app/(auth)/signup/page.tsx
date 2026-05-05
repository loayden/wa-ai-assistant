// FILE: src/app/(auth)/signup/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Signup page delegates validation and mutation state to the form
 * component while preserving the auth route boundary.
 */
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return <SignupForm />;
}
