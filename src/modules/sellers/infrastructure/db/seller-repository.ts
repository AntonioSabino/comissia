import { desc, eq, sql } from "drizzle-orm";
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
      .where(eq(sql<string>`lower(${sellers.email})`, email))
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

  async list() {
    const rows = await db
      .selectDistinctOn([sellers.id], {
        id: sellers.id,
        name: sellers.name,
        document: sellers.document,
        email: sellers.email,
        active: sellers.active,
        rateBasisPoints: sellerCommissionRates.rateBasisPoints,
        effectiveFrom: sellerCommissionRates.effectiveFrom,
      })
      .from(sellers)
      .innerJoin(
        sellerCommissionRates,
        eq(sellerCommissionRates.sellerId, sellers.id),
      )
      .orderBy(sellers.id, desc(sellerCommissionRates.effectiveFrom));

    return rows.sort((first, second) =>
      first.name.localeCompare(second.name, "pt-BR"),
    );
  },
};
