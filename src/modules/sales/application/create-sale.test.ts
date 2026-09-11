import { describe, expect, it, vi } from "vitest";
import {
  SaleValidationError,
  type SaleRegistrationInput,
} from "../domain/sale-registration";
import { createSale, type SaleParticipants } from "./create-sale";
import type { SaleRepository } from "./sale-repository";

const TODAY = "2026-09-10";
const ADMINISTRATOR_ID = "2f81455e-01cd-4b4f-8614-30fda79fd987";
const SELLER_ID = "8d0b7a4e-5c1f-4f6a-9b2e-3c4d5e6f7a8b";

const input: SaleRegistrationInput = {
  administratorId: ADMINISTRATOR_ID,
  sellerId: SELLER_ID,
  customerName: "Cliente Aurora",
  product: "Imóvel",
  groupCode: "1234",
  quotaCode: "567",
  soldOn: "2026-03-15",
  creditAmount: "R$ 200.000,00",
  commissionInstallments: "6",
  firstInstallmentDueOn: "2026-04-15",
};

function createDependencies(overrides: Partial<SaleParticipants> = {}) {
  const repository: SaleRepository = {
    create: vi.fn().mockResolvedValue({ id: "sale-1", code: "V-000001" }),
  };
  const participants: SaleParticipants = {
    isAdministratorActive: vi.fn().mockResolvedValue(true),
    isSellerActive: vi.fn().mockResolvedValue(true),
    findCommissionRateOn: vi
      .fn()
      .mockResolvedValue({ id: "rate-jan", rateBasisPoints: 250 }),
    ...overrides,
  };

  return { repository, participants, today: TODAY };
}

async function fieldErrorsOf(
  promise: Promise<unknown>,
): Promise<Record<string, string>> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return error.fieldErrors;
    }

    throw error;
  }

  throw new Error("Esperava um erro de validação");
}

describe("createSale", () => {
  it("grava a venda com o percentual vigente na data da venda", async () => {
    const dependencies = createDependencies();

    await expect(createSale(input, dependencies)).resolves.toEqual({
      id: "sale-1",
      code: "V-000001",
      creditAmountInCents: BigInt("20000000"),
    });
    expect(dependencies.participants.findCommissionRateOn).toHaveBeenCalledWith(
      SELLER_ID,
      "2026-03-15",
    );
    expect(dependencies.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: SELLER_ID,
        administratorId: ADMINISTRATOR_ID,
        creditAmountInCents: BigInt("20000000"),
        sellerCommissionRateId: "rate-jan",
        sellerRateBasisPoints: 250,
      }),
    );
  });

  it("valida os campos antes de consultar vendedores e administradoras", async () => {
    const dependencies = createDependencies();

    await expect(
      createSale({ ...input, customerName: "" }, dependencies),
    ).rejects.toBeInstanceOf(SaleValidationError);
    expect(dependencies.participants.isSellerActive).not.toHaveBeenCalled();
    expect(dependencies.repository.create).not.toHaveBeenCalled();
  });

  it("recusa vendedor e administradora inativos no mesmo envio", async () => {
    const dependencies = createDependencies({
      isAdministratorActive: vi.fn().mockResolvedValue(false),
      isSellerActive: vi.fn().mockResolvedValue(false),
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      administratorId: "Selecione uma administradora ativa",
      sellerId: "Selecione um vendedor ativo",
    });
    expect(
      dependencies.participants.findCommissionRateOn,
    ).not.toHaveBeenCalled();
    expect(dependencies.repository.create).not.toHaveBeenCalled();
  });

  it("impede a venda sem percentual vigente na data", async () => {
    const dependencies = createDependencies({
      findCommissionRateOn: vi.fn().mockResolvedValue(null),
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      soldOn: "O vendedor não tem percentual vigente nesta data",
    });
    expect(dependencies.repository.create).not.toHaveBeenCalled();
  });
});
