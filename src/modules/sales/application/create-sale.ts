import {
  SaleValidationError,
  validateSaleRegistration,
  type SaleFieldErrors,
  type SaleRegistrationInput,
} from "../domain/sale-registration";
import type { SaleRepository } from "./sale-repository";

type CreateSaleDependencies = {
  repository: SaleRepository;
  /** Data operacional de hoje, usada para recusar vendas futuras. */
  today: string;
};

export type CreatedSale = {
  id: string;
  code: string;
  creditAmountInCents: bigint;
  /** Quantidade de parcelas geradas, definida pela régua da administradora. */
  installments: number;
};

export async function createSale(
  input: SaleRegistrationInput,
  { repository, today }: CreateSaleDependencies,
): Promise<CreatedSale> {
  const sale = validateSaleRegistration(input, today);
  const result = await repository.createWithCommissionSnapshot(sale);

  if (result.status === "invalid-participants") {
    const fieldErrors: SaleFieldErrors = {};

    if (!result.administratorActive) {
      fieldErrors.administratorId = "Selecione uma administradora ativa";
    }

    if (!result.sellerActive) {
      fieldErrors.sellerId = "Selecione um vendedor ativo";
    }

    throw new SaleValidationError(fieldErrors);
  }

  if (result.status === "missing-commission-rate") {
    throw new SaleValidationError({
      soldOn: "O vendedor não tem percentual vigente nesta data",
    });
  }

  if (result.status === "missing-installment-rule") {
    throw new SaleValidationError({
      product:
        "A administradora não tem régua de parcelas para este produto na data da venda",
    });
  }

  if (result.status === "seller-rate-above-rule") {
    throw new SaleValidationError({
      sellerId:
        "O percentual do vendedor excede o que a administradora paga neste produto",
    });
  }

  return {
    id: result.id,
    code: result.code,
    creditAmountInCents: sale.creditAmountInCents,
    installments: result.installments,
  };
}
