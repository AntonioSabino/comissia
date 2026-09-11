import {
  SaleValidationError,
  validateSaleRegistration,
  type SaleFieldErrors,
  type SaleRegistrationInput,
} from "../domain/sale-registration";
import type { SaleRepository } from "./sale-repository";

/**
 * Consultas a vendedores e administradoras de que o cadastro depende. A camada
 * de entrada liga cada uma ao módulo responsável.
 */
export type SaleParticipants = {
  isAdministratorActive(administratorId: string): Promise<boolean>;
  isSellerActive(sellerId: string): Promise<boolean>;
  /** Vigência do vendedor válida na data, ou `null` quando não há percentual. */
  findCommissionRateOn(
    sellerId: string,
    date: string,
  ): Promise<{ id: string; rateBasisPoints: number } | null>;
};

type CreateSaleDependencies = {
  repository: SaleRepository;
  participants: SaleParticipants;
  /** Data operacional de hoje, usada para recusar vendas futuras. */
  today: string;
};

export type CreatedSale = {
  id: string;
  code: string;
  creditAmountInCents: bigint;
};

export async function createSale(
  input: SaleRegistrationInput,
  { repository, participants, today }: CreateSaleDependencies,
): Promise<CreatedSale> {
  const sale = validateSaleRegistration(input, today);
  const [administratorActive, sellerActive] = await Promise.all([
    participants.isAdministratorActive(sale.administratorId),
    participants.isSellerActive(sale.sellerId),
  ]);
  const fieldErrors: SaleFieldErrors = {};

  if (!administratorActive) {
    fieldErrors.administratorId = "Selecione uma administradora ativa";
  }

  if (!sellerActive) {
    fieldErrors.sellerId = "Selecione um vendedor ativo";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new SaleValidationError(fieldErrors);
  }

  const rate = await participants.findCommissionRateOn(
    sale.sellerId,
    sale.soldOn,
  );

  if (!rate) {
    throw new SaleValidationError({
      soldOn: "O vendedor não tem percentual vigente nesta data",
    });
  }

  const created = await repository.create({
    ...sale,
    sellerCommissionRateId: rate.id,
    sellerRateBasisPoints: rate.rateBasisPoints,
  });

  return { ...created, creditAmountInCents: sale.creditAmountInCents };
}
