// FILE: src/app/api/health/route.ts
// [ROLE: DEVOPS ENGINEER]

import packageJson from "../../../../package.json";

type HealthResponse = {
  status: "ok";
  timestamp: string;
  version: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Decision: Render health checks need a fast unauthenticated endpoint that does
 * not touch external services, avoiding false deploy failures from DB/API outages.
 */
export function GET(): Response {
  const response: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: packageJson.version,
  };

  return Response.json(response, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
