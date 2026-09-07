import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { DuplicateSellerError } from "../../application/errors";
import type { SellerRepository } from "../../application/seller-repository";
import { sellerCommissionRates, sellers } from "./schema";

function mapUniqueViolation(error: unknown): never {
  if (error && typeof error === "object" && "code" in error) {
    const databaseError = error as { code?: unknown; constraint?: unknown };

    if (databaseError.code === "23505") {
      if (databaseError.constraint === "sellers_document_unique") {
        throw new DuplicateSellerError("document");
      }

      if (databaseError.constraint === "sellers_email_unique") {
        throw new DuplicateSellerError("email");
      }
    }
  }

  throw error;
}

function todayAsDatabaseDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const sellerRepository: SellerRepository = {
  async isDocumentInUse(document) {
    const [seller] = await db
      .select({ id: sellers.id })
      .from(sellers)
      .where(eq(sellers.document, document))
      .limit(1);

    return Boolean(seller);
  },

  async isEmailInUse(email) {
    const [seller] = await db
      .select({ id: sellers.id })
      .from(sellers)
      .where(eq(sellers.email, email))
      .limit(1);

    return Boolean(seller);
  },

  async createWithInitialRate(seller) {
    try {
      return await db.transaction(async (transaction) => {
        const [createdSeller] = await transaction
          .insert(sellers)
          .values({
            name: seller.name,
            document: seller.document,
            email: seller.email,
            phone: seller.phone,
            active: seller.active,
          })
          .returning({ id: sellers.id });

        await transaction.insert(sellerCommissionRates).values({
          sellerId: createdSeller.id,
          rateBasisPoints: seller.rateBasisPoints,
          effectiveFrom: seller.effectiveFrom,
        });

        return createdSeller;
      });
    } catch (error) {
      return mapUniqueViolation(error);
    }
  },

  async list(filters = {}) {
    const search = filters.search?.trim();
    const conditions = [];

    if (search) {
      const digits = search.replace(/\D/g, "");
      const searchableFields = [
        ilike(sellers.name, `%${search}%`),
        ilike(sellers.email, `%${search}%`),
      ];

      if (digits) {
        searchableFields.push(ilike(sellers.document, `%${digits}%`));
      }

      conditions.push(or(...searchableFields));
    }

    if (filters.active !== undefined) {
      conditions.push(eq(sellers.active, filters.active));
    }

    const sellerRows = await db
      .select({
        id: sellers.id,
        name: sellers.name,
        document: sellers.document,
        email: sellers.email,
        active: sellers.active,
      })
      .from(sellers)
      .where(and(...conditions))
      .orderBy(asc(sellers.name));

    if (sellerRows.length === 0) {
      return [];
    }

    const rateRows = await db
      .select({
        sellerId: sellerCommissionRates.sellerId,
        rateBasisPoints: sellerCommissionRates.rateBasisPoints,
        effectiveFrom: sellerCommissionRates.effectiveFrom,
      })
      .from(sellerCommissionRates)
      .where(
        inArray(
          sellerCommissionRates.sellerId,
          sellerRows.map((seller) => seller.id),
        ),
      )
      .orderBy(desc(sellerCommissionRates.effectiveFrom));

    const currentRateBySeller = new Map<
      string,
      { rateBasisPoints: number; effectiveFrom: string }
    >();
    const today = todayAsDatabaseDate();

    for (const rate of rateRows) {
      if (
        rate.effectiveFrom <= today &&
        !currentRateBySeller.has(rate.sellerId)
      ) {
        currentRateBySeller.set(rate.sellerId, rate);
      }
    }

    return sellerRows.map((seller) => {
      const currentRate = currentRateBySeller.get(seller.id);

      return {
        ...seller,
        rateBasisPoints: currentRate?.rateBasisPoints ?? null,
        effectiveFrom: currentRate?.effectiveFrom ?? null,
      };
    });
  },

  async findById(id) {
    const [seller] = await db
      .select({
        id: sellers.id,
        name: sellers.name,
        document: sellers.document,
        email: sellers.email,
        phone: sellers.phone,
        active: sellers.active,
      })
      .from(sellers)
      .where(eq(sellers.id, id))
      .limit(1);

    if (!seller) {
      return null;
    }

    const commissionRates = await db
      .select({
        id: sellerCommissionRates.id,
        rateBasisPoints: sellerCommissionRates.rateBasisPoints,
        effectiveFrom: sellerCommissionRates.effectiveFrom,
      })
      .from(sellerCommissionRates)
      .where(eq(sellerCommissionRates.sellerId, id))
      .orderBy(desc(sellerCommissionRates.effectiveFrom));

    const today = todayAsDatabaseDate();
    const currentRate = commissionRates.find(
      (rate) => rate.effectiveFrom <= today,
    );

    return {
      ...seller,
      rateBasisPoints: currentRate?.rateBasisPoints ?? null,
      effectiveFrom: currentRate?.effectiveFrom ?? null,
      commissionRates,
    };
  },
};
