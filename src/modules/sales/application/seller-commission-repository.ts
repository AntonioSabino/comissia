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

/**
 * Recortes da listagem de vendas do vendedor. Não há filtro por vendedor de
 * propósito: ele é um argumento à parte, lido da sessão, para que nenhum campo
 * vindo da URL consiga trocar de quem são as vendas.
 */
export type SellerSaleListFilters = {
  /** Texto livre aplicado a código, cliente, produto, grupo e cota. */
  search?: string;
  administratorId?: string;
  quotaStatus?: QuotaStatus;
  /** Recorte pela data da venda, nos dois extremos inclusive. */
  soldFrom?: string;
  soldTo?: string;
};

/** Administradora presente nas vendas do vendedor, para alimentar o filtro. */
export type SellerSaleAdministrator = {
  id: string;
  name: string;
};

/**
 * Venda do vendedor já acompanhada das suas parcelas, para que a tela mostre
 * as duas coisas sem uma leitura por venda.
 */
export type SellerSaleListItem = {
  id: string;
  code: string;
  soldOn: string;
  customerName: string;
  product: string;
  groupCode: string;
  quotaCode: string;
  creditAmountInCents: bigint;
  quotaStatus: QuotaStatus;
  administratorId: string;
  administratorName: string;
  /**
   * Percentual do vendedor gravado na venda. A comissão da listagem sai dele,
   * pela mesma regra do detalhe: é o que define a comissão, e continua
   * disponível nas vendas que não têm parcelas.
   */
  sellerRateBasisPoints: number;
  firstInstallmentDueOn: string;
  /** Da primeira à última; vazia nas vendas registradas antes da régua. */
  installments: SellerSaleInstallment[];
};

export interface SellerCommissionRepository {
  /**
   * Parcelas de comissão do vendedor, da competência mais antiga para a mais
   * recente. O vendedor vem sempre da sessão, nunca da requisição.
   */
  listInstallments(sellerId: string): Promise<SellerCommissionInstallment[]>;
  /**
   * Vendas do vendedor com as parcelas de cada uma, da mais recente para a mais
   * antiga, lidas no mesmo snapshot. Os filtros recortam a lista; o vendedor,
   * que vem da sessão, é a única condição que eles não conseguem afrouxar.
   */
  listSales(
    sellerId: string,
    filters?: SellerSaleListFilters,
  ): Promise<SellerSaleListItem[]>;
  /**
   * Administradoras que aparecem nas vendas do vendedor, em ordem alfabética.
   * O filtro é montado a partir daqui, e não do catálogo inteiro, para não
   * revelar administradoras com as quais ele nunca vendeu.
   */
  listSaleAdministrators(sellerId: string): Promise<SellerSaleAdministrator[]>;
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
