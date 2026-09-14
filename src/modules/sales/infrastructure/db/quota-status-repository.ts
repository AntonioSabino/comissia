import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import type { QuotaStatusRepository } from "../../application/quota-status-repository";
import { saleQuotaStatusEvents, sales } from "./schema";

export const quotaStatusRepository: QuotaStatusRepository = {
  async changeStatus(saleId, status) {
    return db.transaction(async (transaction) => {
      const [sale] = await transaction
        .select({ quotaStatus: sales.quotaStatus })
        .from(sales)
        .where(eq(sales.id, saleId))
        .limit(1)
        .for("update");

      if (!sale) {
        return { kind: "not-found" as const };
      }

      if (sale.quotaStatus === status) {
        return { kind: "unchanged" as const };
      }

      const [updated] = await transaction
        .update(sales)
        .set({
          quotaStatus: status,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleId))
        .returning({ changedAt: sales.updatedAt });

      return {
        kind: "updated" as const,
        previousStatus: sale.quotaStatus,
        status,
        changedAt: updated.changedAt.toISOString(),
      };
    });
  },

  async listHistory(saleId) {
    const events = await db
      .select({
        id: saleQuotaStatusEvents.id,
        sequence: saleQuotaStatusEvents.sequence,
        previousStatus: saleQuotaStatusEvents.previousStatus,
        status: saleQuotaStatusEvents.status,
        changedAt: saleQuotaStatusEvents.changedAt,
      })
      .from(saleQuotaStatusEvents)
      .where(eq(saleQuotaStatusEvents.saleId, saleId))
      .orderBy(asc(saleQuotaStatusEvents.sequence));

    return events.map((event) => ({
      ...event,
      changedAt: event.changedAt.toISOString(),
    }));
  },
};
