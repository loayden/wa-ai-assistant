import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
  },
}));

import { GET } from "@/app/api/health/route";

describe("health endpoint", () => {
  it("returns a lightweight ok response", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.version).toBe("string");
  });
});
