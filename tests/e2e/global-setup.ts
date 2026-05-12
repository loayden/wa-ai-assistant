// FILE: tests/e2e/global-setup.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: E2E tests use one real Supabase auth user and one real mock-mode
 * WhatsApp connection so protected routes can be exercised without bypass-only logic.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadLocalEnvFile() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const rawEnv = readFileSync(envPath, "utf8");

  for (const line of rawEnv.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const unquotedValue = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = unquotedValue;
    }
  }
}

loadLocalEnvFile();

const TEST_EMAIL = "qa-owner@example.com";
const TEST_PASSWORD = "Password1A";

async function ensureAuthUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase E2E setup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const listResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(TEST_EMAIL)}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const listPayload = (await listResponse.json()) as { users?: Array<{ id: string; email?: string }> };
  const existingUser = listPayload.users?.find((user) => user.email === TEST_EMAIL);

  if (existingUser) {
    return existingUser.id;
  }

  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "QA Owner" },
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Unable to create E2E auth user: ${await createResponse.text()}`);
  }

  const createdUser = (await createResponse.json()) as { id: string };
  return createdUser.id;
}

async function ensureAppConnection(userId: string) {
  const prisma = new PrismaClient();

  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: TEST_EMAIL,
        fullName: "QA Owner",
      },
      create: {
        id: userId,
        email: TEST_EMAIL,
        fullName: "QA Owner",
      },
    });

    const existingConnection = await prisma.whatsAppConnection.findFirst({
      where: {
        userId,
        phoneNumberId: "1234567890",
      },
      select: { id: true },
    });

    if (!existingConnection) {
      await prisma.whatsAppConnection.create({
        data: {
          id: randomUUID(),
          userId,
          phoneNumberId: "1234567890",
          businessAccountId: "9876543210",
          accessToken: "mock_access_token_for_e2e_setup",
          webhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "test-whatsapp-verify",
          ownerPhoneNumber: "201001001001",
          displayName: "Support",
          isActive: true,
          isVerified: true,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export default async function globalSetup() {
  const userId = await ensureAuthUser();
  await ensureAppConnection(userId);
}
