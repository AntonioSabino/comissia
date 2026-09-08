import { describe, expect, it, vi } from "vitest";
import { SellerNotFoundError, SellerStatusValidationError } from "./errors";
import type { SellerRepository } from "./seller-repository";
import { changeSellerStatus } from "./change-seller-status";

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
    addCommissionRate: vi.fn().mockResolvedValue({ id: "rate-1" }),
    ...overrides,
  };
}

describe("changeSellerStatus", () => {
  it.each([true, false])("altera a situação para %s", async (active) => {
    const repository = createRepository();

    await expect(
      changeSellerStatus({ sellerId: SELLER_ID, active }, { repository }),
    ).resolves.toEqual({ id: SELLER_ID, active });
    expect(repository.setActive).toHaveBeenCalledWith(SELLER_ID, active);
  });

  it("rejeita situação que não seja booleana", async () => {
    const repository = createRepository();

    await expect(
      changeSellerStatus(
        { sellerId: SELLER_ID, active: "false" },
        { repository },
      ),
    ).rejects.toBeInstanceOf(SellerStatusValidationError);
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("rejeita identificador inválido", async () => {
    const repository = createRepository();

    await expect(
      changeSellerStatus(
        { sellerId: "invalid", active: false },
        { repository },
      ),
    ).rejects.toBeInstanceOf(SellerStatusValidationError);
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("informa quando o vendedor não existe", async () => {
    const repository = createRepository({
      setActive: vi.fn().mockResolvedValue(false),
    });

    await expect(
      changeSellerStatus(
        { sellerId: SELLER_ID, active: false },
        { repository },
      ),
    ).rejects.toBeInstanceOf(SellerNotFoundError);
  });
});
