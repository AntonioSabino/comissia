import {
  installmentRuleTotalBasisPoints,
  validateAdministratorInstallmentRule,
  type AdministratorInstallmentRuleInput,
} from "../domain/administrator-installment-rule";
import type { AdministratorInstallmentRuleRepository } from "./administrator-installment-rule-repository";
import { AdministratorNotFoundError } from "./errors";

type CreateAdministratorInstallmentRuleDependencies = {
  repository: AdministratorInstallmentRuleRepository;
};

export type CreatedAdministratorInstallmentRule = {
  id: string;
  administratorId: string;
  product: string;
  effectiveFrom: string;
  installmentRatesBasisPoints: readonly number[];
  totalBasisPoints: number;
};

/**
 * Cria uma nova vigência da régua de parcelas. A sobreposição de vigências é
 * recusada pelo repositório com `DuplicateAdministratorInstallmentRuleError`.
 */
export async function createAdministratorInstallmentRule(
  input: AdministratorInstallmentRuleInput,
  { repository }: CreateAdministratorInstallmentRuleDependencies,
): Promise<CreatedAdministratorInstallmentRule> {
  const rule = validateAdministratorInstallmentRule(input);
  const created = await repository.create(rule);

  if (!created) {
    throw new AdministratorNotFoundError();
  }

  return {
    id: created.id,
    ...rule,
    totalBasisPoints: installmentRuleTotalBasisPoints(
      rule.installmentRatesBasisPoints,
    ),
  };
}
