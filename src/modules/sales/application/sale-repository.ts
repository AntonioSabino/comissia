import type { QuotaStatus } from "../domain/quota-status";
import type { ValidSaleRegistration } from "../domain/sale-registration";

export type SaleListFilters = {
  /** Texto livre aplicado a código, cliente, produto, grupo e cota. */
  search?: string;
  sellerId?: string;
  administratorId?: string;
  quotaStatus?: QuotaStatus;
  /** Recorte pela data da venda, nos dois extremos inclusive. */
  soldFrom?: string;
  soldTo?: string;
};

export type SaleListItem = {
  id: string;
  code: string;
  soldOn: string;
  sellerId: string;
  sellerName: string;
  administratorId: string;
  administratorName: string;
  customerName: string;
  groupCode: string;
  quotaCode: string;
  creditAmountInCents: bigint;
  quotaStatus: QuotaStatus;
};

export type SaleCreationResult =
  | { status: "created"; id: string; code: string; installments: number }
  | {
      status: "invalid-participants";
      administratorActive: boolean;
      sellerActive: boolean;
    }
  | { status: "missing-commission-rate" }
  | { status: "missing-installment-rule" }
  | { status: "seller-rate-above-rule" };

export interface SaleRepository {
  /**
   * Bloqueia os participantes, confirma suas situações, seleciona o percentual
   * do vendedor e a régua da administradora vigentes na data, gera as parcelas
   * previstas e grava tudo dentro da mesma transação.
   */
  createWithCommissionSnapshot(
    sale: ValidSaleRegistration,
  ): Promise<SaleCreationResult>;
  /** Vendas da mais recente para a mais antiga, com filtros combinados. */
  list(filters?: SaleListFilters): Promise<SaleListItem[]>;
}
