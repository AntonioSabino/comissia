import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { planPayoutTransition } from "@/modules/commissions";
import type { PayoutRepository } from "../../application/payout-repository";
import { collectStatusHistories } from "./installment-status-history";
import {
  commissionInstallments,
  commissionInstallmentStatusEvents,
  sales,
} from "./schema";

export const payoutRepository: PayoutRepository = {
  async advance({ competence, sellerId, transition, now }) {
    return db.transaction(async (transaction) => {
      const conditions: SQL[] = [
        eq(commissionInstallments.competence, competence),
      ];

      if (sellerId) {
        conditions.push(eq(sales.sellerId, sellerId));
      }

      // As parcelas do recorte ficam travadas até o fim da transação: um
      // segundo fechamento simultâneo espera este terminar e então lê o
      // histórico já gravado, em vez de calcular a mesma posição de sequência.
      const installments = await transaction
        .select({
          id: commissionInstallments.id,
          amountInCents: commissionInstallments.amountInCents,
        })
        .from(commissionInstallments)
        .innerJoin(sales, eq(sales.id, commissionInstallments.saleId))
        .where(and(...conditions))
        .orderBy(asc(commissionInstallments.id))
        .for("update", { of: commissionInstallments });

      if (installments.length === 0) {
        return { installments: 0, totalInCents: BigInt(0) };
      }

      const rows = await transaction
        .select({
          installmentId: commissionInstallmentStatusEvents.installmentId,
          previousStatus: commissionInstallmentStatusEvents.previousStatus,
          status: commissionInstallmentStatusEvents.status,
          changedAt: commissionInstallmentStatusEvents.changedAt,
        })
        .from(commissionInstallmentStatusEvents)
        .where(
          inArray(
            commissionInstallmentStatusEvents.installmentId,
            installments.map((installment) => installment.id),
          ),
        )
        .orderBy(
          asc(commissionInstallmentStatusEvents.installmentId),
          asc(commissionInstallmentStatusEvents.sequence),
        );

      const histories = collectStatusHistories(rows);
      // Quem decide qual parcela avança, e em que posição, é o domínio. Uma
      // parcela sem histórico chega vazia e é recusada lá, sem atalho.
      const events = planPayoutTransition(
        installments.map((installment) => ({
          installmentId: installment.id,
          history: histories.get(installment.id) ?? [],
        })),
        transition,
        // O instante é lido aqui, com a trava obtida e o histórico já lido.
        now(),
      );

      if (events.length === 0) {
        return { installments: 0, totalInCents: BigInt(0) };
      }

      await transaction.insert(commissionInstallmentStatusEvents).values(
        events.map((event) => ({
          installmentId: event.installmentId,
          sequence: event.sequence,
          previousStatus: event.entry.previousStatus,
          status: event.entry.status,
          changedAt: new Date(event.entry.changedAt),
        })),
      );

      const advanced = new Set(events.map((event) => event.installmentId));

      return {
        installments: events.length,
        totalInCents: installments
          .filter((installment) => advanced.has(installment.id))
          .reduce(
            (total, installment) => total + installment.amountInCents,
            BigInt(0),
          ),
      };
    });
  },
};
