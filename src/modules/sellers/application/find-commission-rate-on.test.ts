import { describe, expect, it, vi } from "vitest";
import { MissingCommissionRateError } from "./errors";
import { findCommissionRateOn } from "./find-commission-rate-on";

const SELLER_ID = "2f81455e-01cd-4b4f-8614-30fda79fd987";

const rates = [
  { id: "rate-jun", rateBasisPoints: 300, effectiveFrom: "2026-06-01" },
  { id: "rate-jan", rateBasisPoints: 250, effectiveFrom: "2026-01-10" },
];

function createRepository(result = rates) {
  return { listCommissionRates: vi.fn().mockResolvedValue(result) };
}

describe("findCommissionRateOn", () => {
  it("devolve a vigência válida na data da venda", async () => {
    const repository = createRepository();

    await expect(
      findCommissionRateOn(
        { sellerId: SELLER_ID, date: "2026-03-15" },
        { repository },
      ),
    ).resolves.toEqual({
      id: "rate-jan",
      rateBasisPoints: 250,
      effectiveFrom: "2026-01-10",
    });
    expect(repository.listCommissionRates).toHaveBeenCalledWith(SELLER_ID);
  });

  it("impede a venda anterior à primeira vigência do vendedor", async () => {
    await expect(
      findCommissionRateOn(
        { sellerId: SELLER_ID, date: "2025-12-31" },
        { repository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(MissingCommissionRateError);
  });

  it("impede a venda de vendedor sem vigências", async () => {
    await expect(
      findCommissionRateOn(
        { sellerId: SELLER_ID, date: "2026-09-10" },
        { repository: createRepository([]) },
      ),
    ).rejects.toBeInstanceOf(MissingCommissionRateError);
  });
});
