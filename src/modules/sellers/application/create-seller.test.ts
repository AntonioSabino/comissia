import { describe, expect, it, vi } from "vitest";
import { createSeller } from "./create-seller";
import { DuplicateSellerError } from "./errors";
import type { SellerRepository } from "./seller-repository";

function createRepository(
  overrides: Partial<SellerRepository> = {},
): SellerRepository {
  return {
    isDocumentInUse: vi.fn().mockResolvedValue(false),
    isEmailInUse: vi.fn().mockResolvedValue(false),
    createWithInitialRate: vi.fn().mockResolvedValue({ id: "seller-1" }),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    setActive: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const input = {
  name: "Maria da Silva",
  document: "529.982.247-25",
  email: "maria@example.com",
  phone: "(11) 99999-9999",
  active: true,
  ratePercentage: "2,5",
  effectiveFrom: "2026-08-29",
};

describe("createSeller", () => {
  it("persists the seller with its initial effective rate", async () => {
    const repository = createRepository();

    await expect(createSeller(input, { repository })).resolves.toEqual({
      id: "seller-1",
    });
    expect(repository.createWithInitialRate).toHaveBeenCalledWith(
      expect.objectContaining({
        document: "52998224725",
        email: "maria@example.com",
        rateBasisPoints: 250,
        effectiveFrom: "2026-08-29",
      }),
    );
  });

  it("rejects an existing CPF", async () => {
    const repository = createRepository({
      isDocumentInUse: vi.fn().mockResolvedValue(true),
    });

    await expect(createSeller(input, { repository })).rejects.toEqual(
      new DuplicateSellerError("document"),
    );
    expect(repository.createWithInitialRate).not.toHaveBeenCalled();
  });

  it("rejects an existing e-mail", async () => {
    const repository = createRepository({
      isEmailInUse: vi.fn().mockResolvedValue(true),
    });

    await expect(createSeller(input, { repository })).rejects.toEqual(
      new DuplicateSellerError("email"),
    );
    expect(repository.createWithInitialRate).not.toHaveBeenCalled();
  });
});
