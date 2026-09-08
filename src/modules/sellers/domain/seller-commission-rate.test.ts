import { describe, expect, it } from "vitest";
import { validateSellerCommissionRate } from "./seller-commission-rate";
import { SellerValidationError } from "./seller-validation";

describe("seller commission rate validation", () => {
  it("converts the percentage to basis points", () => {
    expect(
      validateSellerCommissionRate({
        ratePercentage: "2,50",
        effectiveFrom: "2026-08-29",
      }),
    ).toEqual({ rateBasisPoints: 250, effectiveFrom: "2026-08-29" });
  });

  it("accepts the percentage boundaries", () => {
    expect(
      validateSellerCommissionRate({
        ratePercentage: "0,01",
        effectiveFrom: "2026-08-29",
      }).rateBasisPoints,
    ).toBe(1);
    expect(
      validateSellerCommissionRate({
        ratePercentage: "100",
        effectiveFrom: "2026-08-29",
      }).rateBasisPoints,
    ).toBe(10_000);
  });

  it("reports the percentage and the effective date", () => {
    let thrown: unknown;

    try {
      validateSellerCommissionRate({
        ratePercentage: "100,01",
        effectiveFrom: "2026-02-30",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SellerValidationError);
    expect((thrown as SellerValidationError).fieldErrors).toEqual({
      ratePercentage: "Informe um percentual entre 0,01% e 100%",
      effectiveFrom: "Informe uma data de vigência válida",
    });
  });
});
