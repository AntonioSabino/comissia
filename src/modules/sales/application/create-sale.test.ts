import { describe, expect, it, vi } from "vitest";
import {
  SaleValidationError,
  type SaleRegistrationInput,
} from "../domain/sale-registration";
import { createSale } from "./create-sale";
import type { SaleCreationResult, SaleRepository } from "./sale-repository";

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
  firstInstallmentDueOn: "2026-04-15",
};

function createDependencies(
  result: SaleCreationResult = {
    status: "created",
    id: "sale-1",
    code: "V-000001",
    installments: 3,
  },
) {
  const repository: SaleRepository = {
    createWithCommissionSnapshot: vi.fn().mockResolvedValue(result),
    list: vi.fn().mockResolvedValue([]),
  };

  return { repository, today: TODAY };
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
  it("delega a criação atômica da venda e devolve o código gerado", async () => {
    const dependencies = createDependencies();

    await expect(createSale(input, dependencies)).resolves.toEqual({
      id: "sale-1",
      code: "V-000001",
      creditAmountInCents: BigInt("20000000"),
      installments: 3,
    });
    expect(
      dependencies.repository.createWithCommissionSnapshot,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: SELLER_ID,
        administratorId: ADMINISTRATOR_ID,
        soldOn: "2026-03-15",
        creditAmountInCents: BigInt("20000000"),
      }),
    );
  });

  it("valida os campos antes de consultar o repositório", async () => {
    const dependencies = createDependencies();

    await expect(
      createSale({ ...input, customerName: "" }, dependencies),
    ).rejects.toBeInstanceOf(SaleValidationError);
    expect(
      dependencies.repository.createWithCommissionSnapshot,
    ).not.toHaveBeenCalled();
  });

  it("recusa vendedor e administradora inativos no mesmo envio", async () => {
    const dependencies = createDependencies({
      status: "invalid-participants",
      administratorActive: false,
      sellerActive: false,
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      administratorId: "Selecione uma administradora ativa",
      sellerId: "Selecione um vendedor ativo",
    });
  });

  it("preserva somente o erro do participante inativo", async () => {
    const dependencies = createDependencies({
      status: "invalid-participants",
      administratorActive: true,
      sellerActive: false,
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      sellerId: "Selecione um vendedor ativo",
    });
  });

  it("impede a venda sem régua da administradora na data", async () => {
    const dependencies = createDependencies({
      status: "missing-installment-rule",
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      product:
        "A administradora não tem régua de parcelas para este produto na data da venda",
    });
  });

  it("impede a venda cujo percentual do vendedor excede a régua", async () => {
    const dependencies = createDependencies({
      status: "seller-rate-above-rule",
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      sellerId:
        "O percentual do vendedor excede o que a administradora paga neste produto",
    });
  });

  it("impede a venda cuja agenda passaria do calendário suportado", async () => {
    const dependencies = createDependencies({
      status: "invalid-installment-schedule",
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      firstInstallmentDueOn:
        "A agenda das parcelas passaria do calendário suportado; revise a primeira previsão",
    });
  });

  it("impede a venda sem percentual vigente na data", async () => {
    const dependencies = createDependencies({
      status: "missing-commission-rate",
    });

    await expect(
      fieldErrorsOf(createSale(input, dependencies)),
    ).resolves.toEqual({
      soldOn: "O vendedor não tem percentual vigente nesta data",
    });
  });
});
