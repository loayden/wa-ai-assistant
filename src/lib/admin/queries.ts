import "server-only";

import { PlanTier, Prisma, SubscriptionStatus } from "@prisma/client";

import { calculateMrrEgp, getUsagePercent } from "@/lib/admin/pricing";
import { prisma } from "@/lib/prisma/client";

export type AdminRange = "7d" | "30d" | "90d";

export function getRangeStart(range: AdminRange, now = new Date()) {
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function getStartOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getStartOfWeek(now = new Date()) {
  const start = getStartOfToday(now);
  start.setDate(start.getDate() - 6);
  return start;
}

export function getStartOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getAdminOverview(now = new Date()) {
  const today = getStartOfToday(now);
  const weekStart = getStartOfWeek(now);
  const monthStart = getStartOfMonth(now);
  const churnCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [totalBusinesses, freeCount, proCount, businessCount, activeThisWeek, messagesToday, messagesThisMonth, ordersToday, leadsToday, signupsToday, signupsThisWeek, churnRisk] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { planTier: PlanTier.FREE } }),
      prisma.user.count({ where: { planTier: PlanTier.PRO } }),
      prisma.user.count({ where: { planTier: PlanTier.BUSINESS } }),
      prisma.user.count({ where: { messages: { some: { createdAt: { gte: weekStart } } } } }),
      prisma.message.count({ where: { createdAt: { gte: today } } }),
      prisma.message.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.lead.count({ where: { detectedAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.count({
        where: {
          planTier: { in: [PlanTier.PRO, PlanTier.BUSINESS] },
          messages: { none: { createdAt: { gte: churnCutoff } } },
        },
      }),
    ]);

  return {
    total_businesses: totalBusinesses,
    active_this_week: activeThisWeek,
    total_paid: proCount + businessCount,
    pro_count: proCount,
    business_count: businessCount,
    free_count: freeCount,
    mrr_egp: calculateMrrEgp({
      [PlanTier.FREE]: freeCount,
      [PlanTier.PRO]: proCount,
      [PlanTier.BUSINESS]: businessCount,
    }),
    total_messages_today: messagesToday,
    total_messages_this_month: messagesThisMonth,
    total_orders_today: ordersToday,
    total_leads_today: leadsToday,
    new_signups_today: signupsToday,
    new_signups_this_week: signupsThisWeek,
    churn_risk: churnRisk,
  };
}

export async function getAdminBusinesses(params: {
  page: number;
  limit: number;
  filter: "all" | "paid" | "free" | "churn_risk";
}) {
  const page = Math.max(1, params.page);
  const limit = Math.min(100, Math.max(1, params.limit));
  const churnCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const baseWhere: Prisma.UserWhereInput =
    params.filter === "paid"
      ? { planTier: { in: [PlanTier.PRO, PlanTier.BUSINESS] } }
      : params.filter === "free"
        ? { planTier: PlanTier.FREE }
        : params.filter === "churn_risk"
          ? { planTier: { in: [PlanTier.PRO, PlanTier.BUSINESS] }, messages: { none: { createdAt: { gte: churnCutoff } } } }
          : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where: baseWhere }),
    prisma.user.findMany({
      where: baseWhere,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        planTier: true,
        monthlyReplyCount: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        },
        _count: {
          select: {
            connections: true,
            knowledgeBaseEntries: true,
          },
        },
      },
    }),
  ]);

  const weekStart = getStartOfWeek();
  const rows = await Promise.all(
    users.map(async (user) => {
      const [messages7d, lastMessage] = await Promise.all([
        prisma.message.count({ where: { userId: user.id, createdAt: { gte: weekStart } } }),
        user.messages[0]?.createdAt ?? null,
      ]);
      const replyLimit = user.planTier === PlanTier.BUSINESS ? 10000 : user.planTier === PlanTier.PRO ? 2000 : 50;

      return {
        id: user.id,
        name: user.fullName ?? user.email,
        email: user.email,
        plan: user.planTier,
        replies_used: user.monthlyReplyCount,
        replies_limit: replyLimit,
        usage_pct: getUsagePercent(user.monthlyReplyCount, replyLimit),
        last_message_at: lastMessage?.toISOString() ?? null,
        messages_7d: messages7d,
        created_at: user.createdAt.toISOString(),
        channel_count: user._count.connections,
        has_knowledge_base: user._count.knowledgeBaseEntries > 0,
        is_onboarded: user.onboardingCompleted,
      };
    }),
  );

  return {
    businesses: rows,
    pagination: {
      total,
      page,
      limit,
    },
  };
}

export async function getAdminRevenue(range: AdminRange) {
  const rangeStart = getRangeStart(range);
  const [freeCount, proCount, businessCount, events] = await Promise.all([
    prisma.user.count({ where: { planTier: PlanTier.FREE } }),
    prisma.user.count({ where: { planTier: PlanTier.PRO } }),
    prisma.user.count({ where: { planTier: PlanTier.BUSINESS } }),
    prisma.subscriptionEvent.findMany({
      where: {
        createdAt: { gte: rangeStart },
        status: SubscriptionStatus.ACTIVE,
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const mrr = calculateMrrEgp({
    [PlanTier.FREE]: freeCount,
    [PlanTier.PRO]: proCount,
    [PlanTier.BUSINESS]: businessCount,
  });
  const dailyRevenue = new Map<string, number>();

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    dailyRevenue.set(key, (dailyRevenue.get(key) ?? 0) + Math.round((event.amount ?? 0) / 100));
  }

  return {
    mrr_egp: mrr,
    arr_egp: mrr * 12,
    daily_revenue: Array.from(dailyRevenue.entries()).map(([date, egp]) => ({ date, egp })),
    plan_breakdown: {
      free: freeCount,
      pro: proCount,
      business: businessCount,
    },
    upgrades_this_month: events.length,
    downgrades_this_month: 0,
  };
}

export async function getAdminBusinessDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      planTier: true,
      subscriptionStatus: true,
      monthlyReplyCount: true,
      onboardingCompleted: true,
      trialEndsAt: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
      connections: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          displayName: true,
          ownerPhoneNumber: true,
          phoneNumberId: true,
          businessAccountId: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
      },
      messages: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          direction: true,
          bodyText: true,
          fromNumber: true,
          toNumber: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          knowledgeBaseEntries: true,
          aiCorrections: true,
          orders: true,
          leads: true,
          messages: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const start = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  const messages = await prisma.message.findMany({
    where: {
      userId,
      createdAt: { gte: start },
    },
    select: {
      createdAt: true,
    },
  });
  const daily = new Map<string, number>();

  for (let index = 0; index < 14; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    daily.set(date.toISOString().slice(0, 10), 0);
  }

  for (const message of messages) {
    const key = message.createdAt.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + 1);
  }

  const replyLimit = user.planTier === PlanTier.BUSINESS ? 10000 : user.planTier === PlanTier.PRO ? 2000 : 50;

  return {
    business: {
      id: user.id,
      name: user.fullName ?? user.email,
      email: user.email,
      plan: user.planTier,
      subscription_status: user.subscriptionStatus,
      replies_used: user.monthlyReplyCount,
      replies_limit: replyLimit,
      usage_pct: getUsagePercent(user.monthlyReplyCount, replyLimit),
      onboarding_completed: user.onboardingCompleted,
      trial_ends_at: user.trialEndsAt?.toISOString() ?? null,
      paid_at: user.paidAt?.toISOString() ?? null,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    },
    channels: user.connections.map((connection) => ({
      id: connection.id,
      display_name: connection.displayName,
      owner_phone_number: connection.ownerPhoneNumber,
      phone_number_id: connection.phoneNumberId,
      business_account_id: connection.businessAccountId,
      is_active: connection.isActive,
      is_verified: connection.isVerified,
      created_at: connection.createdAt.toISOString(),
    })),
    recent_conversations: user.messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      preview: message.bodyText,
      from_number: message.fromNumber,
      to_number: message.toNumber,
      status: message.status,
      created_at: message.createdAt.toISOString(),
    })),
    knowledge_entries: user._count.knowledgeBaseEntries,
    corrections_count: user._count.aiCorrections,
    orders_total: user._count.orders,
    leads_total: user._count.leads,
    messages_total: user._count.messages,
    weekly_messages: Array.from(daily.entries()).map(([date, count]) => ({ date, count })),
  };
}

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .replace(/[؟?!.,،]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export async function getAdminQuestions(range: Extract<AdminRange, "7d" | "30d">) {
  const rangeStart = getRangeStart(range);
  const messages = await prisma.message.findMany({
    where: {
      direction: "INBOUND",
      createdAt: { gte: rangeStart },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
    select: {
      bodyText: true,
    },
  });
  const groups = new Map<string, { theme: string; count: number; example: string }>();

  for (const message of messages) {
    const key = normalizeQuestion(message.bodyText);
    if (!key) continue;

    const current = groups.get(key);
    if (current) {
      current.count += 1;
    } else {
      groups.set(key, {
        theme: key,
        count: 1,
        example: message.bodyText,
      });
    }
  }

  const themes = Array.from(groups.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const total = themes.reduce((sum, theme) => sum + theme.count, 0);

  return {
    total,
    themes: themes.map((theme) => ({
      ...theme,
      percentage: total > 0 ? Math.round((theme.count / total) * 100) : 0,
    })),
  };
}
