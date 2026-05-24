import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("health endpoint", () => {
  it("returns a lightweight ok response", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.version).toBe("string");
  });
});

