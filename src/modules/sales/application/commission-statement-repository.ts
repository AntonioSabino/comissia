import type { AdminCommissionInstallment } from "./admin-commission-repository";

/**
 * Parcela como aparece no demonstrativo: a linha da consulta administrativa
 * mais o que identifica a venda para quem recebe. Nenhum percentual entra
 * aqui — nem o do vendedor, nem o que a corretora recebe da administradora.
 */
export type StatementInstallment = AdminCommissionInstallment & {
  customerName: string;
  administratorName: string;
  product: string;
  groupCode: string;
  quotaCode: string;
  /** Instante da última mudança de situação, em ISO 8601. */
  statusChangedAt: string;
};

export type StatementFilters = {
  /** Na área do vendedor, sempre o vendedor da sessão. */
  sellerId?: string;
  /** Competência no formato AAAA-MM. */
  competence?: string;
};

export interface CommissionStatementRepository {
  listInstallments(filters: StatementFilters): Promise<StatementInstallment[]>;
}
