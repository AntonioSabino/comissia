import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@/db", () => ({
  postgresPool: { query },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("confirma que a aplicação alcança o banco", async () => {
    query.mockResolvedValueOnce({ rows: [{ result: 1 }] });

    const response = await GET();

    expect(query).toHaveBeenCalledWith("SELECT 1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("indica indisponibilidade sem expor o erro do banco", async () => {
    query.mockRejectedValueOnce(new Error("credencial secreta"));

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({
      status: "unavailable",
    });
    expect(body).not.toContain("credencial secreta");
  });
});
