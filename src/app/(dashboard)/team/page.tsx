import { TeamPageClient } from "@/components/team/TeamPageClient";

export default function TeamPage() {
  return (
    <main className="kallem-workspace-page">
      <header className="mb-4 rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_18px_56px_rgba(13,20,33,0.05)] sm:mb-5 sm:rounded-[28px] sm:p-8">
        <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">الفريق</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[46px]">من يعمل معك؟</h1>
        <p className="mt-3 max-w-[680px] text-body-sm leading-6 text-wa-gray-600 sm:text-body-lg">
          ادعِ أعضاء فريقك بالبريد الإلكتروني وحدد دور كل واحد. أنت مالك الحساب دائماً.
        </p>
      </header>
      <TeamPageClient />
    </main>
  );
}
