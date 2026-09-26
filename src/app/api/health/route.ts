// FILE: src/app/api/health/route.ts
// [ROLE: DEVOPS ENGINEER]

import { prisma } from "@/lib/prisma/client";
import packageJson from "../../../../package.json";

type HealthResponse = {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
  database?: "unavailable";
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Decision: Render health checks need a fast endpoint. We now also check DB
 * connectivity to avoid false positives if Postgres is down.
 */
export async function GET(): Promise<Response> {
  const response: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: packageJson.version,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    response.status = "degraded";
    response.database = "unavailable";
    return Response.json(response, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return Response.json(response, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
