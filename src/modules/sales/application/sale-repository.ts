import type { ValidSaleRegistration } from "../domain/sale-registration";

export type SaleCreationResult =
  | { status: "created"; id: string; code: string }
  | {
      status: "invalid-participants";
      administratorActive: boolean;
      sellerActive: boolean;
    }
  | { status: "missing-commission-rate" };

export interface SaleRepository {
  /**
   * Bloqueia os participantes, confirma suas situações, seleciona a vigência e
   * grava a venda com o snapshot dentro da mesma transação.
   */
  createWithCommissionSnapshot(
    sale: ValidSaleRegistration,
  ): Promise<SaleCreationResult>;
}
