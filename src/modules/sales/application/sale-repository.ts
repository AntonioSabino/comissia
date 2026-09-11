import type { ValidSaleRegistration } from "../domain/sale-registration";

/** Venda validada com o snapshot do percentual vigente na data da venda. */
export type SaleRecord = ValidSaleRegistration & {
  sellerCommissionRateId: string;
  sellerRateBasisPoints: number;
};

export interface SaleRepository {
  /** Grava a venda; o código é gerado pelo banco. */
  create(sale: SaleRecord): Promise<{ id: string; code: string }>;
}
