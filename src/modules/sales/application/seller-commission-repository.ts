import type { CommissionInstallmentStatus } from "@/modules/commissions";

export type SellerCommissionInstallment = {
  id: string;
  /** Competência no formato AAAA-MM. */
  competence: string;
  dueOn: string;
  number: number;
  /** Quantidade de parcelas da venda, para exibir a posição da parcela. */
  saleInstallments: number;
  amountInCents: bigint;
  /** Situação atual, derivada do histórico gravado. */
  status: CommissionInstallmentStatus;
  saleId: string;
  saleCode: string;
  product: string;
  administratorName: string;
  customerName: string;
};

export interface SellerCommissionRepository {
  /**
   * Parcelas de comissão do vendedor, da competência mais antiga para a mais
   * recente. O vendedor vem sempre da sessão, nunca da requisição.
   */
  listInstallments(sellerId: string): Promise<SellerCommissionInstallment[]>;
}
