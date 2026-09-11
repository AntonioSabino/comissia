import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { findDatabaseViolation } from "@/db/database-violation";
import { getBusinessDate } from "@/lib/business-date";
import {
  DuplicateSellerCommissionRateError,
  DuplicateSellerError,
} from "../../application/errors";
import type {
  SellerCommissionRateListItem,
  SellerRepository,
} from "../../application/seller-repository";
import { findRateValidOn } from "../../domain/commission-rate-on-date";
import { sellerCommissionRates, sellers } from "./schema";

function mapUniqueViolation(error: unknown): never {
  const violation = findDatabaseViolation(error);

  if (violation?.code === "23505") {
    if (violation.constraint === "sellers_document_unique") {
      throw new DuplicateSellerError("document");
    }

    if (violation.constraint === "sellers_email_unique") {
      throw new DuplicateSellerError("email");
    }
  }

  throw error;
}

function mapCommissionRateViolation(error: unknown): null {
  const violation = findDatabaseViolation(error);

  if (
    violation?.code === "23505" &&
    violation.constraint ===
      "seller_commission_rates_seller_effective_from_unique"
  ) {
    throw new DuplicateSellerCommissionRateError();
  }

  if (violation?.code === "23503") {
    return null;
  }

  throw error;
}

async function hasSellerMatching(
  condition: SQL,
  exceptSellerId?: string,
): Promise<boolean> {
  const conditions = [condition];

  if (exceptSellerId) {
    conditions.push(ne(sellers.id, exceptSellerId));
  }

  const [seller] = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(and(...conditions))
    .limit(1);

  return Boolean(seller);
}

function selectCommissionRates(
  sellerId: string,
): Promise<SellerCommissionRateListItem[]> {
  return db
    .select({
      id: sellerCommissionRates.id,
      rateBasisPoints: sellerCommissionRates.rateBasisPoints,
      effectiveFrom: sellerCommissionRates.effectiveFrom,
    })
    .from(sellerCommissionRates)
    .where(eq(sellerCommissionRates.sellerId, sellerId))
    .orderBy(desc(sellerCommissionRates.effectiveFrom));
}

export const sellerRepository: SellerRepository = {
  async isDocumentInUse(document, exceptSellerId) {
    return hasSellerMatching(eq(sellers.document, document), exceptSellerId);
  },

  async isEmailInUse(email, exceptSellerId) {
    return hasSellerMatching(eq(sellers.email, email), exceptSellerId);
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
    const conditions: SQL[] = [];

    if (search) {
      const digits = search.replace(/\D/g, "");
      const isDocumentSearch =
        digits.length > 0 && digits.length <= 11 && /^[\d.\-\s]+$/.test(search);
      const searchableFields: SQL[] = [
        ilike(sellers.name, `%${search}%`),
        ilike(sellers.email, `%${search}%`),
      ];

      if (isDocumentSearch) {
        searchableFields.push(ilike(sellers.document, `%${digits}%`));
      }

      const searchCondition = or(...searchableFields);

      if (searchCondition) {
        conditions.push(searchCondition);
      }
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
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
      );

    const ratesBySeller = new Map<string, typeof rateRows>();

    for (const rate of rateRows) {
      const rates = ratesBySeller.get(rate.sellerId) ?? [];
      rates.push(rate);
      ratesBySeller.set(rate.sellerId, rates);
    }

    const today = getBusinessDate();

    return sellerRows.map((seller) => {
      const currentRate = findRateValidOn(
        ratesBySeller.get(seller.id) ?? [],
        today,
      );

      return {
        ...seller,
        rateBasisPoints: currentRate?.rateBasisPoints ?? null,
        effectiveFrom: currentRate?.effectiveFrom ?? null,
      };
    });
  },

  async updateProfile(id, profile) {
    try {
      const [updatedSeller] = await db
        .update(sellers)
        .set({
          name: profile.name,
          document: profile.document,
          email: profile.email,
          phone: profile.phone,
          updatedAt: new Date(),
        })
        .where(eq(sellers.id, id))
        .returning({ id: sellers.id });

      return Boolean(updatedSeller);
    } catch (error) {
      return mapUniqueViolation(error);
    }
  },

  async addCommissionRate(sellerId, rate) {
    try {
      const [createdRate] = await db
        .insert(sellerCommissionRates)
        .values({
          sellerId,
          rateBasisPoints: rate.rateBasisPoints,
          effectiveFrom: rate.effectiveFrom,
        })
        .returning({ id: sellerCommissionRates.id });

      return createdRate;
    } catch (error) {
      return mapCommissionRateViolation(error);
    }
  },

  async listCommissionRates(sellerId) {
    return selectCommissionRates(sellerId);
  },

  async setActive(id, active) {
    const [updatedSeller] = await db
      .update(sellers)
      .set({ active, updatedAt: new Date() })
      .where(eq(sellers.id, id))
      .returning({ id: sellers.id });

    return Boolean(updatedSeller);
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

    const commissionRates = await selectCommissionRates(id);
    const currentRate = findRateValidOn(commissionRates, getBusinessDate());

    return {
      ...seller,
      rateBasisPoints: currentRate?.rateBasisPoints ?? null,
      effectiveFrom: currentRate?.effectiveFrom ?? null,
      currentRateId: currentRate?.id ?? null,
      commissionRates,
    };
  },
};
