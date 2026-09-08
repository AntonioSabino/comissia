import { describe, expect, it } from "vitest";
import { getBusinessDate } from "./business-date";

describe("getBusinessDate", () => {
  it("mantém o dia operacional de São Paulo antes da meia-noite local", () => {
    expect(
      getBusinessDate(
        new Date("2026-09-08T01:59:59.000Z"),
        "America/Sao_Paulo",
      ),
    ).toBe("2026-09-07");
  });

  it("avança o dia operacional à meia-noite de São Paulo", () => {
    expect(
      getBusinessDate(
        new Date("2026-09-08T03:00:00.000Z"),
        "America/Sao_Paulo",
      ),
    ).toBe("2026-09-08");
  });
});
