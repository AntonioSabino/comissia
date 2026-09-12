import { findRuleValidOn } from "@/shared/effective-dated-rule";
import { installmentRuleTotalBasisPoints } from "../domain/administrator-installment-rule";
import type { AdministratorInstallmentRuleListItem } from "./administrator-installment-rule-repository";

export type DescribedAdministratorInstallmentRule =
  AdministratorInstallmentRuleListItem & {
    totalBasisPoints: number;
    /** Vigência válida na data operacional para a administradora e o produto. */
    current: boolean;
  };

function groupKey(rule: AdministratorInstallmentRuleListItem): string {
  return `${rule.administratorId}|${rule.product.toLowerCase()}`;
}

/**
 * Acrescenta o percentual total e marca a vigência válida na data dentro de
 * cada administradora e produto. Recebe a lista já carregada, preserva a ordem
 * recebida e não depende dela para escolher a vigência. Produtos escritos em
 * caixas diferentes contam como o mesmo produto, como no índice do banco.
 */
export function describeInstallmentRules(
  rules: readonly AdministratorInstallmentRuleListItem[],
  today: string,
): DescribedAdministratorInstallmentRule[] {
  const versionsByGroup = new Map<
    string,
    AdministratorInstallmentRuleListItem[]
  >();

  for (const rule of rules) {
    const key = groupKey(rule);
    const versions = versionsByGroup.get(key) ?? [];

    versions.push(rule);
    versionsByGroup.set(key, versions);
  }

  const currentIdByGroup = new Map<string, string>();

  for (const [key, versions] of versionsByGroup) {
    const current = findRuleValidOn(versions, today);

    if (current) {
      currentIdByGroup.set(key, current.id);
    }
  }

  return rules.map((rule) => ({
    ...rule,
    totalBasisPoints: installmentRuleTotalBasisPoints(
      rule.installmentRatesBasisPoints,
    ),
    current: currentIdByGroup.get(groupKey(rule)) === rule.id,
  }));
}
