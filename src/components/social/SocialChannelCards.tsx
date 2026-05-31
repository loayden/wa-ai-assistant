"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";

import { ChannelIcon, InstagramIcon, MessengerIcon, WhatsAppIcon } from "@/components/icons/ChannelIcons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiData, ApiClientError } from "@/lib/api/client";
import { INSTAGRAM_DM_PERMISSION_REQUIREMENTS, MESSENGER_PERMISSION_REQUIREMENTS, missingPermissionLabels } from "@/lib/meta/permissions";
import { cn } from "@/lib/utils";

type SocialConnection = {
  id: string;
  channel: "whatsapp" | "instagram" | "messenger";
  displayName: string | null;
  facebookPageId: string | null;
  facebookPageName: string | null;
  facebookPagePicture: string | null;
  instagramAccountId: string | null;
  instagramUsername: string | null;
  instagramProfilePicture: string | null;
  permissionStatus: string;
  permissions: string[];
  isActive: boolean;
  isVerified: boolean;
  webhookSubscribed: boolean;
};

type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  instagram_business_account?: {
    id: string;
    username?: string;
    profile_picture_url?: string;
  } | null;
};

type SocialChannelCardsProps = {
  apiVersion: string;
  appId: string | null;
  whatsappConnected: boolean;
};

const FACEBOOK_SDK_ID = "facebook-jssdk";

function statusLabel(connection?: SocialConnection | null) {
  if (!connection) return "غير متصل";
  if (connection.permissionStatus === "granted" && connection.isActive) return "متصل";
  if (connection.permissionStatus === "partial") return "صلاحيات ناقصة";
  if (connection.permissionStatus === "pending_review") return "يتطلب مراجعة Meta";
  return "يحتاج مراجعة";
}

function statusClass(connection?: SocialConnection | null) {
  if (!connection) return "bg-wa-gray-50 text-wa-gray-600";
  if (connection.permissionStatus === "granted" && connection.isActive) return "bg-wa-success-bg text-wa-success";
  if (connection.permissionStatus === "partial") return "bg-wa-warning-bg text-wa-warning";
  return "bg-wa-error-bg text-wa-error";
}

export function SocialChannelCards({ apiVersion, appId, whatsappConnected }: SocialChannelCardsProps) {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [availablePages, setAvailablePages] = useState<MetaPage[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connecting, setConnecting] = useState<"messenger" | "instagram" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messengerConnection = useMemo(() => connections.find((connection) => connection.channel === "messenger") ?? null, [connections]);
  const instagramConnection = useMemo(() => connections.find((connection) => connection.channel === "instagram") ?? null, [connections]);

  useEffect(() => {
    let active = true;

    async function loadConnections() {
      try {
        const data = await apiData<{ connections: SocialConnection[] }>("/api/meta/pages");
        if (active) {
          setConnections(data.connections);
        }
      } catch {
        if (active) {
          setConnections([]);
        }
      } finally {
        if (active) {
          setLoadingConnections(false);
        }
      }
    }

    void loadConnections();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!appId) {
      return;
    }

    const initializeFacebookSdk = () => {
      if (!window.FB) {
        return;
      }

      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: apiVersion,
      });
      setSdkReady(true);
    };

    if (window.FB) {
      initializeFacebookSdk();
      return;
    }

    window.fbAsyncInit = initializeFacebookSdk;

    if (!document.getElementById(FACEBOOK_SDK_ID)) {
      const script = document.createElement("script");
      script.id = FACEBOOK_SDK_ID;
      script.async = true;
      script.defer = true;
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.onerror = () => setError("تعذر تحميل Meta SDK. حدّث الصفحة وحاول مرة أخرى.");
      document.body.appendChild(script);
    }
  }, [apiVersion, appId]);

  async function refreshConnections() {
    const data = await apiData<{ connections: SocialConnection[] }>("/api/meta/pages");
    setConnections(data.connections);
  }

  function connectMessenger() {
    if (!window.FB || !sdkReady || !appId) {
      setError("Meta Login غير جاهز في هذه البيئة. تأكد من WHATSAPP_APP_ID ثم حدّث الصفحة.");
      return;
    }

    setError(null);
    setConnecting("messenger");
    window.FB.login(
      async (response) => {
        try {
          const code = response.authResponse?.code;

          if (!code) {
            setError("تم إلغاء تسجيل الدخول إلى Meta قبل منح الصلاحيات.");
            return;
          }

          const data = await apiData<{ pages: MetaPage[] }>("/api/meta/oauth/exchange", {
            method: "POST",
            body: JSON.stringify({
              code,
              redirectUri: `${window.location.origin}/connect`,
            }),
          });

          setAvailablePages(data.pages);

          if (data.pages.length === 1) {
            await connectSelectedPage(data.pages[0]);
          }
        } catch (requestError) {
          setError(requestError instanceof ApiClientError ? requestError.message : "فشل ربط ماسنجر.");
        } finally {
          setConnecting(null);
        }
      },
      {
        scope:
          "pages_show_list,pages_messaging,pages_manage_metadata,instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,pages_read_engagement",
        response_type: "code",
        override_default_response_type: true,
      },
    );
  }

  async function connectSelectedPage(page: MetaPage) {
    setConnecting("messenger");
    try {
      await apiData("/api/meta/connect-page", {
        method: "POST",
        body: JSON.stringify({
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          pagePicture: page.picture?.data?.url,
        }),
      });
      await refreshConnections();
    } catch (requestError) {
      setError(requestError instanceof ApiClientError ? requestError.message : "فشل حفظ صفحة Facebook.");
    } finally {
      setConnecting(null);
    }
  }

  async function connectInstagram(page: MetaPage) {
    if (!page.instagram_business_account?.id) {
      setError("هذه الصفحة لا تحتوي على حساب Instagram Business مرتبط.");
      return;
    }

    setConnecting("instagram");
    try {
      await apiData("/api/meta/connect-instagram", {
        method: "POST",
        body: JSON.stringify({
          pageId: page.id,
          instagramAccountId: page.instagram_business_account.id,
          instagramUsername: page.instagram_business_account.username,
          instagramProfilePicture: page.instagram_business_account.profile_picture_url,
        }),
      });
      await refreshConnections();
    } catch (requestError) {
      setError(requestError instanceof ApiClientError ? requestError.message : "فشل ربط إنستجرام.");
    } finally {
      setConnecting(null);
    }
  }

  const messengerMissing = missingPermissionLabels(messengerConnection?.permissions ?? [], MESSENGER_PERMISSION_REQUIREMENTS);
  const instagramMissing = missingPermissionLabels(instagramConnection?.permissions ?? [], INSTAGRAM_DM_PERMISSION_REQUIREMENTS);
  const canConnectInstagram = Boolean(messengerConnection);

  return (
    <section className="rounded-[22px] border border-wa-gray-100 bg-white p-4 shadow-[0_14px_42px_rgba(13,20,33,0.04)] sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">القنوات</p>
          <h2 className="mt-2 text-h2 font-semibold text-wa-gray-900">ربط قنوات السوشيال</h2>
          <p className="mt-2 max-w-[720px] text-body-sm leading-6 text-wa-gray-600">
            ابدأ بربط حساب Meta مرة واحدة لقراءة صفحات Facebook وحسابات Instagram Business المرتبطة بها، ثم تظهر المحادثات في نفس صندوق الرسائل.
          </p>
        </div>
        {loadingConnections ? <Loader2 className="size-5 animate-spin text-wa-blue-600" aria-hidden="true" /> : null}
      </div>

      {error ? (
        <Alert className="mt-4 border-wa-error-bg bg-wa-error-bg text-wa-error">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>تعذر الربط</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <ChannelCard
          icon={<WhatsAppIcon className="size-6" />}
          title="واتساب"
          description="الرد على العملاء عبر رقم WhatsApp Business."
          status={whatsappConnected ? "متصل" : "غير متصل"}
          statusClassName={whatsappConnected ? "bg-wa-success-bg text-wa-success" : "bg-wa-gray-50 text-wa-gray-600"}
          actionHref="/whatsapp"
          actionLabel={whatsappConnected ? "إدارة واتساب" : "ربط واتساب"}
        />
        <ChannelCard
          icon={<MessengerIcon className="size-6" />}
          title="ماسنجر"
          description="استقبل ورد على رسائل صفحة Facebook."
          status={statusLabel(messengerConnection)}
          statusClassName={statusClass(messengerConnection)}
          actionDisabled={connecting === "messenger" || !appId}
          actionLabel={messengerConnection ? "تحديث الصلاحيات" : "ربط حساب Meta"}
          onAction={connectMessenger}
        >
          {messengerMissing.length > 0 && messengerConnection ? <MissingPermissions permissions={messengerMissing} /> : null}
        </ChannelCard>
        <ChannelCard
          icon={<InstagramIcon className="size-6" />}
          title="إنستجرام"
          description="استقبل ورد على Instagram DMs من نفس الصندوق."
          status={statusLabel(instagramConnection)}
          statusClassName={statusClass(instagramConnection)}
          actionDisabled={connecting === "instagram" || !canConnectInstagram}
          actionLabel={instagramConnection ? "تحديث إنستجرام" : canConnectInstagram ? "ربط إنستجرام" : "ابدأ بربط Meta"}
          onAction={() => {
            const page = availablePages.find((item) => item.id === messengerConnection?.facebookPageId);
            if (page) {
              void connectInstagram(page);
            } else {
              connectMessenger();
            }
          }}
        >
          {!messengerConnection ? (
            <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-body-sm leading-6 text-wa-gray-600">
              اربط حساب Meta/صفحة Facebook أولاً حتى نقرأ حساب Instagram Business المرتبط بها.
            </p>
          ) : instagramMissing.length > 0 && instagramConnection ? (
            <MissingPermissions permissions={instagramMissing} />
          ) : null}
        </ChannelCard>
      </div>

      {availablePages.length > 1 ? (
        <div className="mt-4 rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-3">
          <p className="text-body-sm font-semibold text-wa-gray-900">اختر صفحة Facebook للربط</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availablePages.map((page) => (
              <button
                key={page.id}
                type="button"
                className="rounded-2xl border border-wa-gray-100 bg-white p-3 text-right transition hover:border-wa-blue-100 hover:bg-wa-blue-50"
                onClick={() => void connectSelectedPage(page)}
              >
                <span className="block text-body-sm font-semibold text-wa-gray-900">{page.name}</span>
                <span className="mt-1 block text-label text-wa-gray-500">
                  {page.instagram_business_account?.username ? `Instagram @${page.instagram_business_account.username}` : "لا يوجد Instagram Business ظاهر"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-body-sm leading-6 text-blue-800">
        للاختبار المجاني: الرسائل تعمل مع حسابات مضافة كـ Admin أو Tester في Meta App. للعموم، Meta قد تطلب App Review لصلاحيات `pages_messaging` و`instagram_business_manage_messages`.
      </div>
    </section>
  );
}

function ChannelCard({
  actionDisabled,
  actionHref,
  actionLabel,
  children,
  description,
  icon,
  onAction,
  status,
  statusClassName,
  title,
}: {
  actionDisabled?: boolean;
  actionHref?: string;
  actionLabel: string;
  children?: ReactNode;
  description: string;
  icon: React.ReactNode;
  onAction?: () => void;
  status: string;
  statusClassName: string;
  title: string;
}) {
  const actionClassName = cn(
    "mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-body-sm font-semibold transition",
    actionDisabled ? "cursor-not-allowed bg-wa-gray-100 text-wa-gray-400" : "bg-wa-blue-600 text-white hover:bg-wa-blue-700",
  );

  return (
    <div className="rounded-2xl border border-wa-gray-100 bg-wa-gray-50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-body font-semibold text-wa-gray-900">{title}</h3>
            <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold", statusClassName)}>{status}</span>
          </div>
          <p className="mt-1 text-body-sm leading-5 text-wa-gray-600">{description}</p>
        </div>
      </div>
      {children}
      {actionHref ? (
        <a className={actionClassName} href={actionHref}>
          {actionLabel}
        </a>
      ) : (
        <Button className={actionClassName} disabled={actionDisabled} type="button" onClick={onAction}>
          {actionDisabled ? <Lock className="size-4" aria-hidden="true" /> : <ChannelIcon channel={title === "ماسنجر" ? "messenger" : "instagram"} className="size-4" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function MissingPermissions({ permissions }: { permissions: string[] }) {
  return (
    <div className="mt-3 rounded-2xl border border-wa-warning-bg bg-white px-3 py-2 text-body-sm text-wa-warning">
      <p className="font-semibold">صلاحيات ناقصة:</p>
      <ul className="mt-1 list-inside list-disc">
        {permissions.map((permission) => (
          <li key={permission}>{permission}</li>
        ))}
      </ul>
    </div>
  );
}
