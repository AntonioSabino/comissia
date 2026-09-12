import { describe, expect, it } from "vitest";
import {
  INITIAL_QUOTA_STATUS,
  isQuotaStatus,
  QUOTA_STATUSES,
} from "./quota-status";

describe("quota status", () => {
  it("disponibiliza as situações definidas pelo negócio", () => {
    expect(QUOTA_STATUSES).toEqual([
      "adimplente",
      "inadimplente",
      "cancelado",
      "contemplado",
    ]);
  });

  it("nasce adimplente", () => {
    expect(INITIAL_QUOTA_STATUS).toBe("adimplente");
  });

  it("reconhece somente situações suportadas", () => {
    expect(isQuotaStatus("contemplado")).toBe(true);
    expect(isQuotaStatus("quitado")).toBe(false);
    expect(isQuotaStatus(undefined)).toBe(false);
  });
});
