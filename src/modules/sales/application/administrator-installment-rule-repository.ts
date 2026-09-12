import type { ValidAdministratorInstallmentRule } from "../domain/administrator-installment-rule";

export type AdministratorInstallmentRuleVersion = {
  id: string;
  administratorId: string;
  product: string;
  effectiveFrom: string;
  /** Da primeira à última parcela, na ordem gravada. */
  installmentRatesBasisPoints: number[];
};

export type AdministratorInstallmentRuleListItem =
  AdministratorInstallmentRuleVersion & {
    administratorName: string;
  };

export type AdministratorInstallmentRuleListFilters = {
  administratorId?: string;
};

export type AdministratorInstallmentRuleCreationResult =
  | { status: "created"; id: string }
  | { status: "unknown-administrator" }
  | { status: "inactive-administrator" };

export interface AdministratorInstallmentRuleRepository {
  /**
   * Grava uma nova vigência sem alterar as versões anteriores, depois de
   * confirmar que a administradora existe e está ativa.
   */
  create(
    rule: ValidAdministratorInstallmentRule,
  ): Promise<AdministratorInstallmentRuleCreationResult>;
  /**
   * Versões da régua da administradora para o produto ou plano, comparado sem
   * diferenciar maiúsculas de minúsculas. A ordem da lista não é garantida.
   */
  listVersions(
    administratorId: string,
    product: string,
  ): Promise<AdministratorInstallmentRuleVersion[]>;
  /**
   * Réguas cadastradas com o nome da administradora, por administradora e
   * produto, da vigência mais recente para a mais antiga.
   */
  list(
    filters?: AdministratorInstallmentRuleListFilters,
  ): Promise<AdministratorInstallmentRuleListItem[]>;
}
