import type { CommissionInstallmentStatus } from "@/modules/commissions";

export type AdminCommissionListFilters = {
  /** Recorte por competência AAAA-MM, nos dois extremos inclusive. */
  competenceFrom?: string;
  competenceTo?: string;
  sellerId?: string;
  installmentStatus?: CommissionInstallmentStatus;
};

export type AdminCommissionInstallment = {
  id: string;
  competence: string;
  dueOn: string;
  number: number;
  saleInstallments: number;
  amountInCents: bigint;
  /** Situação atual, derivada do histórico gravado. */
  status: CommissionInstallmentStatus;
  saleId: string;
  saleCode: string;
  sellerId: string;
  sellerName: string;
};

export interface AdminCommissionRepository {
  /** Parcelas mais recentes primeiro, com os filtros administrativos combinados. */
  listInstallments(
    filters?: AdminCommissionListFilters,
  ): Promise<AdminCommissionInstallment[]>;
}
