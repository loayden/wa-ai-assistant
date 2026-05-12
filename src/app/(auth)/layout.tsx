// FILE: src/app/(auth)/layout.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Auth routes use one centered surface so account creation and login
 * stay focused on the form instead of shared marketing navigation.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-wa-gray-50 px-4">
      {children}
    </main>
  );
}
