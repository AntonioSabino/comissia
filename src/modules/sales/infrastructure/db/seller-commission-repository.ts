import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
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

  async listSales(sellerId, filters = {}) {
    // O vendedor da sessão abre a lista de condições: os filtros que vêm da
    // URL só conseguem estreitar o recorte, nunca sair das vendas dele.
    const conditions: SQL[] = [eq(sales.sellerId, sellerId)];
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

    // Duas leituras, um instante: as vendas e as parcelas delas vêm do mesmo
    // snapshot, então a lista nunca mostra uma venda sem as parcelas que ela
    // tinha quando foi lida.
    return db.transaction(
      async (transaction) => {
        const saleRows = await transaction
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
            administratorId: sales.administratorId,
            administratorName: administrators.name,
            firstInstallmentDueOn: sales.firstInstallmentDueOn,
          })
          .from(sales)
          .innerJoin(
            administrators,
            eq(administrators.id, sales.administratorId),
          )
          .where(and(...conditions))
          .orderBy(desc(sales.soldOn), desc(sales.createdAt));

        if (saleRows.length === 0) {
          return [];
        }

        const rows = await transaction
          .select({
            id: commissionInstallments.id,
            saleId: commissionInstallments.saleId,
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
          .where(
            inArray(
              commissionInstallments.saleId,
              saleRows.map((sale) => sale.id),
            ),
          )
          .orderBy(
            asc(commissionInstallments.number),
            asc(commissionInstallmentStatusEvents.sequence),
          );

        const histories = collectStatusHistories(
          rows.map((row) => ({ ...row, installmentId: row.id })),
        );
        // Venda sem parcela continua na lista, com a lista vazia: é o que são
        // as vendas registradas antes de a régua existir.
        const installments = new Map<string, SellerSaleInstallment[]>(
          saleRows.map((sale) => [sale.id, []]),
        );
        const seen = new Set<string>();

        for (const row of rows) {
          if (seen.has(row.id)) {
            continue;
          }

          seen.add(row.id);
          installments.get(row.saleId)?.push({
            id: row.id,
            number: row.number,
            competence: row.competence,
            dueOn: row.dueOn,
            amountInCents: row.amountInCents,
            status: resolveInstallmentStatus(histories, row.id),
          });
        }

        return saleRows.map((sale) => ({
          ...sale,
          installments: installments.get(sale.id) ?? [],
        }));
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  },

  async listSaleAdministrators(sellerId) {
    return db
      .selectDistinct({ id: administrators.id, name: administrators.name })
      .from(sales)
      .innerJoin(administrators, eq(administrators.id, sales.administratorId))
      .where(eq(sales.sellerId, sellerId))
      .orderBy(asc(administrators.name));
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
