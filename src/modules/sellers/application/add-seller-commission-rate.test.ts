import { describe, expect, it, vi } from "vitest";
import { SellerValidationError } from "../domain/seller-validation";
import { addSellerCommissionRate } from "./add-seller-commission-rate";
import { InvalidSellerIdError, SellerNotFoundError } from "./errors";
import type { SellerRepository } from "./seller-repository";

const SELLER_ID = "2f81455e-01cd-4b4f-8614-30fda79fd987";

function createRepository(
  overrides: Partial<SellerRepository> = {},
): SellerRepository {
  return {
    isDocumentInUse: vi.fn().mockResolvedValue(false),
    isEmailInUse: vi.fn().mockResolvedValue(false),
    createWithInitialRate: vi.fn().mockResolvedValue({ id: SELLER_ID }),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    setActive: vi.fn().mockResolvedValue(true),
    updateProfile: vi.fn().mockResolvedValue(true),
    addCommissionRate: vi.fn().mockResolvedValue({ id: "rate-2" }),
    listCommissionRates: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const input = {
  sellerId: SELLER_ID,
  ratePercentage: "3,25",
  effectiveFrom: "2026-10-01",
};

describe("addSellerCommissionRate", () => {
  it("registra uma nova vigência sem alterar as anteriores", async () => {
    const repository = createRepository();

    await expect(
      addSellerCommissionRate(input, { repository }),
    ).resolves.toEqual({
      id: "rate-2",
      rateBasisPoints: 325,
      effectiveFrom: "2026-10-01",
    });
    expect(repository.addCommissionRate).toHaveBeenCalledWith(SELLER_ID, {
      rateBasisPoints: 325,
      effectiveFrom: "2026-10-01",
    });
  });

  it("rejeita identificador inválido", async () => {
    const repository = createRepository();

    await expect(
      addSellerCommissionRate(
        { ...input, sellerId: "invalid" },
        { repository },
      ),
    ).rejects.toBeInstanceOf(InvalidSellerIdError);
    expect(repository.addCommissionRate).not.toHaveBeenCalled();
  });

  it("rejeita percentual e data inválidos", async () => {
    const repository = createRepository();

    await expect(
      addSellerCommissionRate(
        { ...input, ratePercentage: "0", effectiveFrom: "01/10/2026" },
        { repository },
      ),
    ).rejects.toBeInstanceOf(SellerValidationError);
    expect(repository.addCommissionRate).not.toHaveBeenCalled();
  });

  it("informa quando o vendedor não existe", async () => {
    const repository = createRepository({
      addCommissionRate: vi.fn().mockResolvedValue(null),
    });

    await expect(
      addSellerCommissionRate(input, { repository }),
    ).rejects.toBeInstanceOf(SellerNotFoundError);
  });
});
