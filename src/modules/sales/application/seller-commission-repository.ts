import type { CommissionInstallmentStatus } from "@/modules/commissions";
import type { QuotaStatus } from "../domain/quota-status";

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
  /**
   * Uma venda do vendedor com as suas parcelas, lidas no mesmo snapshot.
   * Devolve `null` quando a venda não existe ou não é dele — sem distinguir os
   * dois casos, para não confirmar a existência de venda de outro vendedor.
   */
  findSale(saleId: string, sellerId: string): Promise<SellerSaleDetails | null>;
}

export type SellerSaleInstallment = {
  id: string;
  number: number;
  /** Competência no formato AAAA-MM. */
  competence: string;
  dueOn: string;
  amountInCents: bigint;
  /** Situação atual, derivada do histórico gravado. */
  status: CommissionInstallmentStatus;
};

/**
 * Venda na visão do vendedor. Não traz a régua nem qualquer percentual da
 * corretora: pelo MVP, o que a administradora paga à corretora não aparece
 * para o vendedor. O percentual dele, que é o que define a comissão dele,
 * aparece.
 */
export type SellerSaleDetails = {
  id: string;
  code: string;
  soldOn: string;
  customerName: string;
  product: string;
  groupCode: string;
  quotaCode: string;
  creditAmountInCents: bigint;
  quotaStatus: QuotaStatus;
  administratorName: string;
  sellerRateBasisPoints: number;
  sellerRateEffectiveFrom: string;
  firstInstallmentDueOn: string;
  /** Da primeira à última parcela. */
  installments: SellerSaleInstallment[];
};
