import type { ValidAdministratorInstallmentRule } from "../domain/administrator-installment-rule";

export type AdministratorInstallmentRuleVersion = {
  id: string;
  administratorId: string;
  product: string;
  effectiveFrom: string;
  /** Da primeira à última parcela, na ordem gravada. */
  installmentRatesBasisPoints: number[];
};

export interface AdministratorInstallmentRuleRepository {
  /**
   * Grava uma nova vigência sem alterar as versões anteriores. Devolve `null`
   * quando a administradora informada não existe.
   */
  create(
    rule: ValidAdministratorInstallmentRule,
  ): Promise<{ id: string } | null>;
  /**
   * Versões da régua da administradora para o produto ou plano, comparado sem
   * diferenciar maiúsculas de minúsculas. A ordem da lista não é garantida.
   */
  listVersions(
    administratorId: string,
    product: string,
  ): Promise<AdministratorInstallmentRuleVersion[]>;
}
