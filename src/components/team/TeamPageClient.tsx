"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Team seats are invite records owned by the account owner.
 * Supabase Auth owns identity; this surface owns roles and invite state.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, RefreshCw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiData } from "@/lib/api/client";
import { translateError } from "@/lib/errors/translateError";
import { cn } from "@/lib/utils";

type TeamRole = "admin" | "member";

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamResponse {
  members: TeamMember[];
  ownerEmail: string;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "مشرف",
  member: "عضو",
};

function roleLabel(role: string) {
  return role === "admin" ? ROLE_LABELS.admin : ROLE_LABELS.member;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function TeamPageClient() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const [emailError, setEmailError] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["team"],
    queryFn: () => apiData<TeamResponse>("/api/team"),
  });

  const members = teamQuery.data?.members ?? [];
  const ownerEmail = teamQuery.data?.ownerEmail ?? null;

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiData<{ member: TeamMember }>("/api/team", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      }),
    onSuccess: () => {
      setEmail("");
      setRole("member");
      setEmailError(null);
      toast.success("تم إرسال الدعوة بنجاح.");
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error) => {
      toast.error(translateError(error instanceof Error ? error.message : error));
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, nextRole }: { id: string; nextRole: TeamRole }) =>
      apiData<{ member: TeamMember }>(`/api/team/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      }),
    onSuccess: () => {
      toast.success("تم تحديث دور العضو.");
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error) => {
      toast.error(translateError(error instanceof Error ? error.message : error));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      apiData<{ deleted: boolean }>(`/api/team/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("تم حذف العضو.");
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error) => {
      toast.error(translateError(error instanceof Error ? error.message : error));
    },
  });

  function handleInvite() {
    const trimmed = email.trim();

    if (!trimmed) {
      setEmailError("اكتب البريد الإلكتروني للعضو.");
      return;
    }

    if (!isValidEmail(trimmed)) {
      setEmailError("اكتب بريداً إلكترونياً صحيحاً.");
      return;
    }

    setEmailError(null);
    inviteMutation.mutate();
  }

  return (
    <div className="kallem-workspace-page space-y-4">
      <section className="rounded-[28px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
            <MailPlus className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-body-lg font-semibold text-wa-gray-900">دعوة عضو جديد</h2>
            <p className="text-body-sm text-wa-gray-500">المشرف يدير كل شيء معك، والعضو يتابع المحادثات فقط.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
          <label className="space-y-2">
            <span className="text-body-sm font-semibold text-wa-gray-800">البريد الإلكتروني *</span>
            <Input
              type="email"
              autoComplete="email"
              placeholder="member@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
              }}
            />
            {emailError ? <p className="text-body-sm text-wa-error">{emailError}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-body-sm font-semibold text-wa-gray-800">الدور *</span>
            <select
              className="h-12 w-full rounded-lg border border-wa-gray-100 bg-white px-3 text-body-sm text-wa-gray-800 focus-visible:border-wa-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-wa-blue-50 sm:h-14"
              value={role}
              onChange={(event) => setRole(event.target.value as TeamRole)}
            >
              <option value="member">عضو</option>
              <option value="admin">مشرف</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button className="min-h-11 w-full sm:w-auto" isLoading={inviteMutation.isPending} onClick={handleInvite}>
              <MailPlus className="size-4" aria-hidden="true" />
              إرسال الدعوة
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-wa-gray-900">أعضاء الفريق</h2>
          <Button size="sm" variant="outline" onClick={() => void teamQuery.refetch()}>
            <RefreshCw className={cn("size-4", teamQuery.isFetching && "animate-spin")} aria-hidden="true" />
            تحديث
          </Button>
        </div>
        {teamQuery.isLoading ? (
          <p className="rounded-2xl border border-wa-gray-100 bg-white p-4 text-body-sm text-wa-gray-500">جار تحميل الفريق...</p>
        ) : teamQuery.isError ? (
          <p className="rounded-2xl border border-wa-gray-100 bg-white p-4 text-body-sm leading-6 text-wa-error">
            {translateError(teamQuery.error instanceof Error ? teamQuery.error.message : teamQuery.error)}
          </p>
        ) : (
          <div className="grid gap-3">
            {ownerEmail ? (
              <article className="flex items-center justify-between gap-3 rounded-2xl border border-wa-gray-100 bg-white p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wa-blue-600 text-white">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-wa-gray-900" dir="ltr">
                      {ownerEmail}
                    </p>
                    <p className="text-label text-wa-gray-500">مالك الحساب</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-wa-blue-50 px-3 py-1 text-label font-semibold text-wa-blue-700">مالك</span>
              </article>
            ) : null}
            {members.length === 0 ? (
              <p className="rounded-2xl border border-wa-gray-100 bg-white p-4 text-body-sm leading-6 text-wa-gray-600">
                لا يوجد أعضاء بعد. ادعِ أول عضو من الأعلى وسيظهر هنا بحالة &quot;مدعو&quot;.
              </p>
            ) : (
              members.map((member) => (
                <article key={member.id} className="flex flex-col gap-3 rounded-2xl border border-wa-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wa-gray-100 text-wa-gray-600">
                      <UserRound className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-wa-gray-900" dir="ltr">
                        {member.email}
                      </p>
                      <p className="text-label text-wa-gray-500">{member.status === "active" ? "نشط" : "مدعو"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`دور ${member.email}`}
                      className="h-11 rounded-lg border border-wa-gray-100 bg-white px-3 text-body-sm text-wa-gray-800 focus-visible:border-wa-blue-600 focus-visible:outline-none"
                      value={member.role === "admin" ? "admin" : "member"}
                      disabled={roleMutation.isPending}
                      onChange={(event) => roleMutation.mutate({ id: member.id, nextRole: event.target.value as TeamRole })}
                    >
                      <option value="member">عضو</option>
                      <option value="admin">مشرف</option>
                    </select>
                    <span className="hidden rounded-full bg-wa-gray-100 px-3 py-1 text-label font-semibold text-wa-gray-600 sm:inline">
                      {roleLabel(member.role)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`حذف ${member.email}`}
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`حذف ${member.email} من الفريق؟`)) {
                          removeMutation.mutate(member.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      حذف
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
