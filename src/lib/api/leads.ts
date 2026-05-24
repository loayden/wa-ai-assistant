import type { Lead } from "@prisma/client";

import type { LeadResponse } from "@/types/api";

export function maskPhoneNumber(value: string): string {
  const normalized = value.replace(/\D/g, "");
  const suffix = normalized.slice(-4);

  return suffix ? `•••• ${suffix}` : "••••";
}

export function serializeLead(lead: Lead): LeadResponse {
  return {
    id: lead.id,
    userId: lead.userId,
    messageId: lead.messageId,
    connectionId: lead.connectionId,
    customerPhone: lead.customerPhone,
    customerPhoneMasked: maskPhoneNumber(lead.customerPhone),
    customerName: lead.customerName,
    interest: lead.interest,
    channel: lead.channel as LeadResponse["channel"],
    status: lead.status as LeadResponse["status"],
    detectedAt: lead.detectedAt.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

function escapeCsvValue(value: string | null | undefined): string {
  const safe = value ?? "";

  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }

  return safe;
}

export function leadsToCsv(leads: Lead[]): string {
  const header = ["Phone", "Interest", "Channel", "Status", "Date"];
  const rows = leads.map((lead) => [
    lead.customerPhone,
    lead.interest,
    lead.channel,
    lead.status,
    lead.detectedAt.toISOString(),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}
