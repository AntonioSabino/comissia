import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { findDatabaseViolation } from "@/db/database-violation";
import type {
  AdministratorInstallmentRuleCreationResult,
  AdministratorInstallmentRuleRepository,
} from "../../application/administrator-installment-rule-repository";
import { DuplicateAdministratorInstallmentRuleError } from "../../application/errors";
import { administratorInstallmentRules, administrators } from "./schema";

/**
 * A vigência repetida vem do índice único. A chave estrangeira só pode falhar
 * se a administradora desaparecer depois da confirmação, e é tratada como
 * administradora inexistente.
 */
function mapInstallmentRuleViolation(
  error: unknown,
): AdministratorInstallmentRuleCreationResult {
  const violation = findDatabaseViolation(error);

  if (
    violation?.code === "23505" &&
    violation.constraint ===
      "administrator_installment_rules_effective_from_unique"
  ) {
    throw new DuplicateAdministratorInstallmentRuleError();
  }

  if (violation?.code === "23503") {
    return { status: "unknown-administrator" };
  }

  throw error;
}

export const administratorInstallmentRuleRepository: AdministratorInstallmentRuleRepository =
  {
    async create(rule) {
      return db.transaction(async (transaction) => {
        // A linha da administradora fica bloqueada até o fim da gravação, para
        // que uma inativação concorrente não caia entre a conferência e o insert.
        const [administrator] = await transaction
          .select({ active: administrators.active })
          .from(administrators)
          .where(eq(administrators.id, rule.administratorId))
          .limit(1)
          .for("update");

        if (!administrator) {
          return { status: "unknown-administrator" as const };
        }

        if (!administrator.active) {
          return { status: "inactive-administrator" as const };
        }

        try {
          const [created] = await transaction
            .insert(administratorInstallmentRules)
            .values({
              administratorId: rule.administratorId,
              product: rule.product,
              effectiveFrom: rule.effectiveFrom,
              installmentRatesBasisPoints: [
                ...rule.installmentRatesBasisPoints,
              ],
            })
            .returning({ id: administratorInstallmentRules.id });

          return { status: "created" as const, id: created.id };
        } catch (error) {
          return mapInstallmentRuleViolation(error);
        }
      });
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

    async list(filters = {}) {
      return db
        .select({
          id: administratorInstallmentRules.id,
          administratorId: administratorInstallmentRules.administratorId,
          administratorName: administrators.name,
          product: administratorInstallmentRules.product,
          effectiveFrom: administratorInstallmentRules.effectiveFrom,
          installmentRatesBasisPoints:
            administratorInstallmentRules.installmentRatesBasisPoints,
        })
        .from(administratorInstallmentRules)
        .innerJoin(
          administrators,
          eq(administrators.id, administratorInstallmentRules.administratorId),
        )
        .where(
          filters.administratorId
            ? eq(
                administratorInstallmentRules.administratorId,
                filters.administratorId,
              )
            : undefined,
        )
        .orderBy(
          asc(administrators.name),
          asc(administratorInstallmentRules.product),
          desc(administratorInstallmentRules.effectiveFrom),
        );
    },
  };
