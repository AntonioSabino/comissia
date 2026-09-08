import { describe, expect, it, vi } from "vitest";
import { SellerValidationError } from "../domain/seller-validation";
import {
  DuplicateSellerError,
  InvalidSellerIdError,
  SellerNotFoundError,
} from "./errors";
import type { SellerRepository } from "./seller-repository";
import { updateSeller } from "./update-seller";

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

const input = {
  sellerId: SELLER_ID,
  name: "Maria da Silva",
  document: "529.982.247-25",
  email: "MARIA@example.com",
  phone: "(11) 99999-9999",
};

describe("updateSeller", () => {
  it("atualiza os dados cadastrais normalizados", async () => {
    const repository = createRepository();

    await expect(updateSeller(input, { repository })).resolves.toEqual({
      id: SELLER_ID,
    });
    expect(repository.updateProfile).toHaveBeenCalledWith(SELLER_ID, {
      name: "Maria da Silva",
      document: "52998224725",
      email: "maria@example.com",
      phone: "11999999999",
    });
  });

  it("não considera o próprio cadastro como duplicado", async () => {
    const repository = createRepository();

    await updateSeller(input, { repository });

    expect(repository.isDocumentInUse).toHaveBeenCalledWith(
      "52998224725",
      SELLER_ID,
    );
    expect(repository.isEmailInUse).toHaveBeenCalledWith(
      "maria@example.com",
      SELLER_ID,
    );
  });

  it("rejeita identificador inválido", async () => {
    const repository = createRepository();

    await expect(
      updateSeller({ ...input, sellerId: "invalid" }, { repository }),
    ).rejects.toBeInstanceOf(InvalidSellerIdError);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it("rejeita dados cadastrais inválidos", async () => {
    const repository = createRepository();

    await expect(
      updateSeller({ ...input, document: "123" }, { repository }),
    ).rejects.toBeInstanceOf(SellerValidationError);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it("rejeita CPF de outro vendedor", async () => {
    const repository = createRepository({
      isDocumentInUse: vi.fn().mockResolvedValue(true),
    });

    await expect(updateSeller(input, { repository })).rejects.toEqual(
      new DuplicateSellerError("document"),
    );
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it("rejeita e-mail de outro vendedor", async () => {
    const repository = createRepository({
      isEmailInUse: vi.fn().mockResolvedValue(true),
    });

    await expect(updateSeller(input, { repository })).rejects.toEqual(
      new DuplicateSellerError("email"),
    );
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it("informa quando o vendedor não existe", async () => {
    const repository = createRepository({
      updateProfile: vi.fn().mockResolvedValue(false),
    });

    await expect(updateSeller(input, { repository })).rejects.toBeInstanceOf(
      SellerNotFoundError,
    );
  });
});
