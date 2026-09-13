import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import type {
  SellerCommissionInstallment,
  SellerCommissionRepository,
} from "../../application/seller-commission-repository";
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

export const sellerCommissionRepository: SellerCommissionRepository = {
  async listInstallments(sellerId) {
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
        product: sales.product,
        administratorName: administrators.name,
        customerName: sales.customerName,
        installmentId: commissionInstallmentStatusEvents.installmentId,
        previousStatus: commissionInstallmentStatusEvents.previousStatus,
        status: commissionInstallmentStatusEvents.status,
        changedAt: commissionInstallmentStatusEvents.changedAt,
      })
      .from(commissionInstallments)
      .innerJoin(sales, eq(sales.id, commissionInstallments.saleId))
      .innerJoin(administrators, eq(administrators.id, sales.administratorId))
      .leftJoin(
        commissionInstallmentStatusEvents,
        eq(
          commissionInstallmentStatusEvents.installmentId,
          commissionInstallments.id,
        ),
      )
      // O vendedor vem da sessão: a consulta nunca aceita outro pela borda.
      .where(eq(sales.sellerId, sellerId))
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
    const installments = new Map<string, SellerCommissionInstallment>();

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
        product: row.product,
        administratorName: row.administratorName,
        customerName: row.customerName,
      });
    }

    return [...installments.values()];
  },
};
