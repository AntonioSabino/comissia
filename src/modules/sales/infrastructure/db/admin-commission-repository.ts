import { and, asc, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { sellers } from "@/modules/sellers";
import type {
  AdminCommissionInstallment,
  AdminCommissionRepository,
} from "../../application/admin-commission-repository";
import {
  collectStatusHistories,
  resolveInstallmentStatus,
} from "./installment-status-history";
import {
  commissionInstallments,
  commissionInstallmentStatusEvents,
  sales,
} from "./schema";

export const adminCommissionRepository: AdminCommissionRepository = {
  async listInstallments(filters = {}) {
    const conditions: SQL[] = [];

    if (filters.competenceFrom) {
      conditions.push(
        gte(commissionInstallments.competence, filters.competenceFrom),
      );
    }

    if (filters.competenceTo) {
      conditions.push(
        lte(commissionInstallments.competence, filters.competenceTo),
      );
    }

    if (filters.sellerId) {
      conditions.push(eq(sales.sellerId, filters.sellerId));
    }

    const rows = await db
      .select({
        id: commissionInstallments.id,
        competence: commissionInstallments.competence,
        dueOn: commissionInstallments.dueOn,
        number: commissionInstallments.number,
        saleInstallments: sales.commissionInstallments,
        amountInCents: commissionInstallments.amountInCents,
        saleId: sales.id,
        saleCode: sales.code,
        sellerId: sellers.id,
        sellerName: sellers.name,
        previousStatus: commissionInstallmentStatusEvents.previousStatus,
        status: commissionInstallmentStatusEvents.status,
        changedAt: commissionInstallmentStatusEvents.changedAt,
      })
      .from(commissionInstallments)
      .innerJoin(sales, eq(sales.id, commissionInstallments.saleId))
      .innerJoin(sellers, eq(sellers.id, sales.sellerId))
      .leftJoin(
        commissionInstallmentStatusEvents,
        eq(
          commissionInstallmentStatusEvents.installmentId,
          commissionInstallments.id,
        ),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        desc(commissionInstallments.competence),
        asc(commissionInstallments.dueOn),
        asc(sellers.name),
        asc(sales.code),
        asc(commissionInstallments.number),
        asc(commissionInstallmentStatusEvents.sequence),
      );

    const histories = collectStatusHistories(
      rows.map((row) => ({ ...row, installmentId: row.id })),
    );
    const installments = new Map<string, AdminCommissionInstallment>();

    for (const row of rows) {
      if (installments.has(row.id)) {
        continue;
      }

      installments.set(row.id, {
        id: row.id,
        competence: row.competence,
        dueOn: row.dueOn,
        number: row.number,
        saleInstallments: row.saleInstallments,
        amountInCents: row.amountInCents,
        status: resolveInstallmentStatus(histories, row.id),
        saleId: row.saleId,
        saleCode: row.saleCode,
        sellerId: row.sellerId,
        sellerName: row.sellerName,
      });
    }

    const result = [...installments.values()];

    return filters.installmentStatus
      ? result.filter(
          (installment) => installment.status === filters.installmentStatus,
        )
      : result;
  },
};
