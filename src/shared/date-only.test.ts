import { describe, expect, it } from "vitest";
import { isValidDateOnly } from "./date-only";

describe("isValidDateOnly", () => {
  it("aceita datas existentes no formato AAAA-MM-DD", () => {
    expect(isValidDateOnly("2026-09-10")).toBe(true);
    expect(isValidDateOnly("2028-02-29")).toBe(true);
  });

  it.each([
    "2026-02-30",
    "2027-02-29",
    "2026-13-01",
    "10/09/2026",
    "",
    "2026-9-1",
  ])("recusa %j", (value) => {
    expect(isValidDateOnly(value)).toBe(false);
  });
});
