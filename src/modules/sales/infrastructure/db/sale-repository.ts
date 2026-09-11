import { db } from "@/db";
import type { SaleRepository } from "../../application/sale-repository";
import { sales } from "./schema";

export const saleRepository: SaleRepository = {
  async create(sale) {
    const [created] = await db
      .insert(sales)
      .values({
        administratorId: sale.administratorId,
        sellerId: sale.sellerId,
        sellerCommissionRateId: sale.sellerCommissionRateId,
        sellerRateBasisPoints: sale.sellerRateBasisPoints,
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

    return created;
  },
};
