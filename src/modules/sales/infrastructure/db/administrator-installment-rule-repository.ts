import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { findDatabaseViolation } from "@/db/database-violation";
import type { AdministratorInstallmentRuleRepository } from "../../application/administrator-installment-rule-repository";
import { DuplicateAdministratorInstallmentRuleError } from "../../application/errors";
import { administratorInstallmentRules } from "./schema";

/**
 * A vigência repetida vem do índice único e a administradora inexistente da
 * chave estrangeira, que o caso de uso trata como administradora não
 * encontrada.
 */
function mapInstallmentRuleViolation(error: unknown): null {
  const violation = findDatabaseViolation(error);

  if (
    violation?.code === "23505" &&
    violation.constraint ===
      "administrator_installment_rules_effective_from_unique"
  ) {
    throw new DuplicateAdministratorInstallmentRuleError();
  }

  if (violation?.code === "23503") {
    return null;
  }

  throw error;
}

export const administratorInstallmentRuleRepository: AdministratorInstallmentRuleRepository =
  {
    async create(rule) {
      try {
        const [created] = await db
          .insert(administratorInstallmentRules)
          .values({
            administratorId: rule.administratorId,
            product: rule.product,
            effectiveFrom: rule.effectiveFrom,
            installmentRatesBasisPoints: [...rule.installmentRatesBasisPoints],
          })
          .returning({ id: administratorInstallmentRules.id });

        return created;
      } catch (error) {
        return mapInstallmentRuleViolation(error);
      }
    },

    async listVersions(administratorId, product) {
      return db
        .select({
          id: administratorInstallmentRules.id,
          administratorId: administratorInstallmentRules.administratorId,
          product: administratorInstallmentRules.product,
          effectiveFrom: administratorInstallmentRules.effectiveFrom,
          installmentRatesBasisPoints:
            administratorInstallmentRules.installmentRatesBasisPoints,
        })
        .from(administratorInstallmentRules)
        .where(
          and(
            eq(administratorInstallmentRules.administratorId, administratorId),
            sql`lower(${administratorInstallmentRules.product}) = lower(${product})`,
          ),
        )
        .orderBy(desc(administratorInstallmentRules.effectiveFrom));
    },
  };
