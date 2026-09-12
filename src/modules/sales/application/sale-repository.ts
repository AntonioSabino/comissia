import type { CommissionInstallmentStatus } from "@/modules/commissions";
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

export type SaleInstallmentDetail = {
  id: string;
  number: number;
  /** Competência no formato AAAA-MM. */
  competence: string;
  dueOn: string;
  /** Pedaço da régua que originou a parcela. */
  ruleRateBasisPoints: number;
  amountInCents: bigint;
  /** Situação atual, derivada do histórico gravado. */
  status: CommissionInstallmentStatus;
};

export type SaleDetails = {
  id: string;
  code: string;
  soldOn: string;
  customerName: string;
  product: string;
  groupCode: string;
  quotaCode: string;
  creditAmountInCents: bigint;
  quotaStatus: QuotaStatus;
  firstInstallmentDueOn: string;
  sellerId: string;
  sellerName: string;
  administratorId: string;
  administratorName: string;
  /** Percentual do vendedor gravado na venda e a vigência de onde ele veio. */
  sellerRateBasisPoints: number;
  sellerCommissionRateId: string;
  sellerRateEffectiveFrom: string;
  /**
   * Régua aplicada. Nula nas vendas registradas antes de a régua existir, que
   * também não têm parcelas.
   */
  installmentRuleId: string | null;
  installmentRuleEffectiveFrom: string | null;
  installmentRuleProduct: string | null;
  installmentRatesBasisPoints: number[] | null;
  installments: SaleInstallmentDetail[];
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
  | { status: "seller-rate-above-rule" }
  | { status: "invalid-installment-schedule" };

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
  /**
   * Dados cadastrais, snapshot do cálculo e parcelas da venda em uma única
   * consulta, para que a tela não precise juntar leituras soltas.
   */
  findById(id: string): Promise<SaleDetails | null>;
}
