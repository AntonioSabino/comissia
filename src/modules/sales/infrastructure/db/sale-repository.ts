import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  commissionInstallments,
  commissionInstallmentStatusEvents,
  generateSellerCommissionInstallments,
} from "@/modules/commissions";
import {
  findCommissionRateOn,
  MissingCommissionRateError,
  sellerCommissionRates,
  sellers,
} from "@/modules/sellers";
import { MissingAdministratorInstallmentRuleError } from "../../application/errors";
import { findAdministratorInstallmentRuleOn } from "../../application/find-administrator-installment-rule-on";
import type { SaleRepository } from "../../application/sale-repository";
import { administratorInstallmentRules, administrators, sales } from "./schema";

export const saleRepository: SaleRepository = {
  async createWithCommissionSnapshot(sale) {
    return db.transaction(async (transaction) => {
      const [administrator] = await transaction
        .select({ active: administrators.active })
        .from(administrators)
        .where(eq(administrators.id, sale.administratorId))
        .limit(1)
        .for("update");

      const [seller] = await transaction
        .select({ active: sellers.active })
        .from(sellers)
        .where(eq(sellers.id, sale.sellerId))
        .limit(1)
        .for("update");

      const administratorActive = administrator?.active ?? false;
      const sellerActive = seller?.active ?? false;

      if (!administratorActive || !sellerActive) {
        return {
          status: "invalid-participants" as const,
          administratorActive,
          sellerActive,
        };
      }

      let rate;

      try {
        rate = await findCommissionRateOn(
          { sellerId: sale.sellerId, date: sale.soldOn },
          {
            repository: {
              listCommissionRates(rateSellerId) {
                return transaction
                  .select({
                    id: sellerCommissionRates.id,
                    rateBasisPoints: sellerCommissionRates.rateBasisPoints,
                    effectiveFrom: sellerCommissionRates.effectiveFrom,
                  })
                  .from(sellerCommissionRates)
                  .where(eq(sellerCommissionRates.sellerId, rateSellerId))
                  .orderBy(desc(sellerCommissionRates.effectiveFrom));
              },
            },
          },
        );
      } catch (error) {
        if (error instanceof MissingCommissionRateError) {
          return { status: "missing-commission-rate" as const };
        }

        throw error;
      }

      let rule;

      try {
        rule = await findAdministratorInstallmentRuleOn(
          {
            administratorId: sale.administratorId,
            product: sale.product,
            date: sale.soldOn,
          },
          {
            repository: {
              listVersions(administratorId, product) {
                return transaction
                  .select({
                    id: administratorInstallmentRules.id,
                    administratorId:
                      administratorInstallmentRules.administratorId,
                    product: administratorInstallmentRules.product,
                    effectiveFrom: administratorInstallmentRules.effectiveFrom,
                    installmentRatesBasisPoints:
                      administratorInstallmentRules.installmentRatesBasisPoints,
                  })
                  .from(administratorInstallmentRules)
                  .where(
                    and(
                      eq(
                        administratorInstallmentRules.administratorId,
                        administratorId,
                      ),
                      sql`lower(${administratorInstallmentRules.product}) = lower(${product})`,
                    ),
                  )
                  .orderBy(desc(administratorInstallmentRules.effectiveFrom));
              },
            },
          },
        );
      } catch (error) {
        if (error instanceof MissingAdministratorInstallmentRuleError) {
          return { status: "missing-installment-rule" as const };
        }

        throw error;
      }

      // O dinheiro do vendedor sai de dentro do que a administradora paga à
      // corretora, então o total da régua é o teto do percentual acordado.
      if (rule.totalBasisPoints < rate.rateBasisPoints) {
        return { status: "seller-rate-above-rule" as const };
      }

      const installments = generateSellerCommissionInstallments({
        creditAmountInCents: sale.creditAmountInCents,
        sellerRateBasisPoints: rate.rateBasisPoints,
        installmentRatesBasisPoints: rule.installmentRatesBasisPoints,
        firstInstallmentDueOn: sale.firstInstallmentDueOn,
        createdAt: new Date(),
      });

      const [created] = await transaction
        .insert(sales)
        .values({
          administratorId: sale.administratorId,
          administratorInstallmentRuleId: rule.id,
          sellerId: sale.sellerId,
          sellerCommissionRateId: rate.id,
          sellerRateBasisPoints: rate.rateBasisPoints,
          installmentRatesBasisPoints: [...rule.installmentRatesBasisPoints],
          customerName: sale.customerName,
          product: sale.product,
          groupCode: sale.groupCode,
          quotaCode: sale.quotaCode,
          soldOn: sale.soldOn,
          creditAmountInCents: sale.creditAmountInCents,
          commissionInstallments: installments.length,
          firstInstallmentDueOn: sale.firstInstallmentDueOn,
        })
        .returning({ id: sales.id, code: sales.code });

      const persistedInstallments = await transaction
        .insert(commissionInstallments)
        .values(
          installments.map((installment) => ({
            saleId: created.id,
            number: installment.number,
            competence: installment.competence,
            dueOn: installment.dueOn,
            ruleRateBasisPoints: installment.rateBasisPoints,
            amountInCents: installment.amountInCents,
          })),
        )
        .returning({
          id: commissionInstallments.id,
          number: commissionInstallments.number,
        });

      const installmentIdByNumber = new Map(
        persistedInstallments.map(({ id, number }) => [number, id]),
      );

      await transaction.insert(commissionInstallmentStatusEvents).values(
        installments.flatMap((installment) =>
          installment.statusHistory.map((entry) => ({
            installmentId: installmentIdByNumber.get(installment.number) ?? "",
            previousStatus: entry.previousStatus,
            status: entry.status,
            changedAt: new Date(entry.changedAt),
          })),
        ),
      );

      return {
        status: "created" as const,
        ...created,
        installments: installments.length,
      };
    });
  },

  async list(filters = {}) {
    const conditions: SQL[] = [];
    const search = filters.search?.trim();

    if (search) {
      const searchCondition = or(
        ilike(sales.code, `%${search}%`),
        ilike(sales.customerName, `%${search}%`),
        ilike(sales.product, `%${search}%`),
        ilike(sales.groupCode, `%${search}%`),
        ilike(sales.quotaCode, `%${search}%`),
      );

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (filters.sellerId) {
      conditions.push(eq(sales.sellerId, filters.sellerId));
    }

    if (filters.administratorId) {
      conditions.push(eq(sales.administratorId, filters.administratorId));
    }

    if (filters.quotaStatus) {
      conditions.push(eq(sales.quotaStatus, filters.quotaStatus));
    }

    if (filters.soldFrom) {
      conditions.push(gte(sales.soldOn, filters.soldFrom));
    }

    if (filters.soldTo) {
      conditions.push(lte(sales.soldOn, filters.soldTo));
    }

    return db
      .select({
        id: sales.id,
        code: sales.code,
        soldOn: sales.soldOn,
        sellerId: sales.sellerId,
        sellerName: sellers.name,
        administratorId: sales.administratorId,
        administratorName: administrators.name,
        customerName: sales.customerName,
        groupCode: sales.groupCode,
        quotaCode: sales.quotaCode,
        creditAmountInCents: sales.creditAmountInCents,
        quotaStatus: sales.quotaStatus,
      })
      .from(sales)
      .innerJoin(sellers, eq(sellers.id, sales.sellerId))
      .innerJoin(administrators, eq(administrators.id, sales.administratorId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sales.soldOn), desc(sales.createdAt));
  },
};
