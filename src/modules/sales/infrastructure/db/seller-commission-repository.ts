import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import type {
  SellerCommissionInstallment,
  SellerCommissionRepository,
  SellerSaleDetails,
  SellerSaleInstallment,
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
import { sellerCommissionRates } from "@/modules/sellers";

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

  async findSale(saleId, sellerId) {
    // Duas leituras, um instante: a venda e as parcelas vêm do mesmo snapshot.
    return db.transaction(
      async (transaction) => {
        const [sale] = await transaction
          .select({
            id: sales.id,
            code: sales.code,
            soldOn: sales.soldOn,
            customerName: sales.customerName,
            product: sales.product,
            groupCode: sales.groupCode,
            quotaCode: sales.quotaCode,
            creditAmountInCents: sales.creditAmountInCents,
            quotaStatus: sales.quotaStatus,
            administratorName: administrators.name,
            sellerRateBasisPoints: sales.sellerRateBasisPoints,
            sellerRateEffectiveFrom: sellerCommissionRates.effectiveFrom,
            firstInstallmentDueOn: sales.firstInstallmentDueOn,
          })
          .from(sales)
          .innerJoin(
            administrators,
            eq(administrators.id, sales.administratorId),
          )
          .innerJoin(
            sellerCommissionRates,
            eq(sellerCommissionRates.id, sales.sellerCommissionRateId),
          )
          // O vendedor entra na condição: venda de outro vendedor não existe
          // para esta consulta.
          .where(and(eq(sales.id, saleId), eq(sales.sellerId, sellerId)))
          .limit(1);

        if (!sale) {
          return null;
        }

        const rows = await transaction
          .select({
            id: commissionInstallments.id,
            number: commissionInstallments.number,
            competence: commissionInstallments.competence,
            dueOn: commissionInstallments.dueOn,
            amountInCents: commissionInstallments.amountInCents,
            previousStatus: commissionInstallmentStatusEvents.previousStatus,
            status: commissionInstallmentStatusEvents.status,
            changedAt: commissionInstallmentStatusEvents.changedAt,
          })
          .from(commissionInstallments)
          .leftJoin(
            commissionInstallmentStatusEvents,
            eq(
              commissionInstallmentStatusEvents.installmentId,
              commissionInstallments.id,
            ),
          )
          .where(eq(commissionInstallments.saleId, saleId))
          .orderBy(
            asc(commissionInstallments.number),
            asc(commissionInstallmentStatusEvents.sequence),
          );

        const histories = collectStatusHistories(
          rows.map((row) => ({ ...row, installmentId: row.id })),
        );
        const installments = new Map<string, SellerSaleInstallment>();

        for (const row of rows) {
          if (installments.has(row.id)) {
            continue;
          }

          installments.set(row.id, {
            id: row.id,
            number: row.number,
            competence: row.competence,
            dueOn: row.dueOn,
            amountInCents: row.amountInCents,
            status: resolveInstallmentStatus(histories, row.id),
          });
        }

        const details: SellerSaleDetails = {
          ...sale,
          installments: [...installments.values()],
        };

        return details;
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  },
};
