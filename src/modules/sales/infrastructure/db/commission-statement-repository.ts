import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { sellers } from "@/modules/sellers";
import type {
  CommissionStatementRepository,
  StatementInstallment,
} from "../../application/commission-statement-repository";
import {
  collectStatusHistories,
  resolveInstallmentStatus,
} from "./installment-status-history";
import {
  administrators,
  commissionInstallments,
  commissionInstallmentStatusEvents,
  sales,
} from "./schema";

export const commissionStatementRepository: CommissionStatementRepository = {
  async listInstallments({ sellerId, competence }) {
    const conditions: SQL[] = [];

    // Na área do vendedor, o vendedor vem da sessão e fecha o recorte: o
    // demonstrativo nunca alcança parcela de outro vendedor.
    if (sellerId) {
      conditions.push(eq(sales.sellerId, sellerId));
    }

    if (competence) {
      conditions.push(eq(commissionInstallments.competence, competence));
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
        customerName: sales.customerName,
        administratorName: administrators.name,
        product: sales.product,
        groupCode: sales.groupCode,
        quotaCode: sales.quotaCode,
        previousStatus: commissionInstallmentStatusEvents.previousStatus,
        status: commissionInstallmentStatusEvents.status,
        changedAt: commissionInstallmentStatusEvents.changedAt,
      })
      .from(commissionInstallments)
      .innerJoin(sales, eq(sales.id, commissionInstallments.saleId))
      .innerJoin(sellers, eq(sellers.id, sales.sellerId))
      .innerJoin(administrators, eq(administrators.id, sales.administratorId))
      .leftJoin(
        commissionInstallmentStatusEvents,
        eq(
          commissionInstallmentStatusEvents.installmentId,
          commissionInstallments.id,
        ),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        asc(commissionInstallments.competence),
        asc(commissionInstallments.dueOn),
        asc(sales.code),
        asc(commissionInstallments.number),
        asc(commissionInstallmentStatusEvents.sequence),
      );

    const histories = collectStatusHistories(
      rows.map((row) => ({ ...row, installmentId: row.id })),
    );
    const installments = new Map<string, StatementInstallment>();

    for (const row of rows) {
      if (installments.has(row.id)) {
        continue;
      }

      const history = histories.get(row.id) ?? [];

      installments.set(row.id, {
        id: row.id,
        competence: row.competence,
        dueOn: row.dueOn,
        number: row.number,
        saleInstallments: row.saleInstallments,
        amountInCents: row.amountInCents,
        // Sem atalho: histórico vazio é recusado pelo domínio.
        status: resolveInstallmentStatus(histories, row.id),
        statusChangedAt: history[history.length - 1]?.changedAt ?? "",
        saleId: row.saleId,
        saleCode: row.saleCode,
        sellerId: row.sellerId,
        sellerName: row.sellerName,
        customerName: row.customerName,
        administratorName: row.administratorName,
        product: row.product,
        groupCode: row.groupCode,
        quotaCode: row.quotaCode,
      });
    }

    return [...installments.values()];
  },
};
