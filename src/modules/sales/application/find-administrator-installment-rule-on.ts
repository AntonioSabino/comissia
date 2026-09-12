import { findRuleValidOn } from "@/shared/effective-dated-rule";
import { installmentRuleTotalBasisPoints } from "../domain/administrator-installment-rule";
import type {
  AdministratorInstallmentRuleRepository,
  AdministratorInstallmentRuleVersion,
} from "./administrator-installment-rule-repository";
import { MissingAdministratorInstallmentRuleError } from "./errors";

type FindAdministratorInstallmentRuleOnDependencies = {
  repository: Pick<AdministratorInstallmentRuleRepository, "listVersions">;
};

export type AdministratorInstallmentRuleOnDate =
  AdministratorInstallmentRuleVersion & {
    totalBasisPoints: number;
  };

/**
 * Régua de parcelas que a administradora tem vigente em uma data para o
 * produto ou plano da venda. Sem vigência nessa data, a venda não pode ser
 * calculada. Uma vigência posterior não altera a regra encontrada para datas
 * anteriores.
 */
export async function findAdministratorInstallmentRuleOn(
  {
    administratorId,
    product,
    date,
  }: { administratorId: string; product: string; date: string },
  { repository }: FindAdministratorInstallmentRuleOnDependencies,
): Promise<AdministratorInstallmentRuleOnDate> {
  const versions = await repository.listVersions(administratorId, product);
  const rule = findRuleValidOn(versions, date);

  if (!rule) {
    throw new MissingAdministratorInstallmentRuleError();
  }

  return {
    ...rule,
    totalBasisPoints: installmentRuleTotalBasisPoints(
      rule.installmentRatesBasisPoints,
    ),
  };
}
