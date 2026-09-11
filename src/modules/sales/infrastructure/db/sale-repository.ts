import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  findCommissionRateOn,
  MissingCommissionRateError,
  sellerCommissionRates,
  sellers,
} from "@/modules/sellers";
import type { SaleRepository } from "../../application/sale-repository";
import { administrators, sales } from "./schema";

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

      const [created] = await transaction
        .insert(sales)
        .values({
          administratorId: sale.administratorId,
          sellerId: sale.sellerId,
          sellerCommissionRateId: rate.id,
          sellerRateBasisPoints: rate.rateBasisPoints,
          customerName: sale.customerName,
          product: sale.product,
          groupCode: sale.groupCode,
          quotaCode: sale.quotaCode,
          soldOn: sale.soldOn,
          creditAmountInCents: sale.creditAmountInCents,
          commissionInstallments: sale.commissionInstallments,
          firstInstallmentDueOn: sale.firstInstallmentDueOn,
        })
        .returning({ id: sales.id, code: sales.code });

      return { status: "created" as const, ...created };
    });
  },
};
