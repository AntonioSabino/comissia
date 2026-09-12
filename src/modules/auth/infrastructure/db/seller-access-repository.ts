import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { findDatabaseViolation } from "@/db/database-violation";
import { sellers } from "@/modules/sellers/infrastructure/db/schema";
import type {
  SellerAccessCreationResult,
  SellerAccessRepository,
} from "../../application/seller-access-repository";
import { sessions, users } from "./schema";

const SELLER_ACCESS_COLUMNS = {
  userId: users.id,
  sellerId: users.sellerId,
  email: users.email,
  active: users.active,
};

/**
 * Traduz as restrições do banco para os resultados esperados pelo caso de uso.
 * O vínculo único por vendedor e a unicidade do e-mail são garantidos lá, não
 * apenas conferidos antes de gravar.
 *
 * Criar o acesso duas vezes esbarra primeiro em `users_email_unique`, porque o
 * e-mail vem do próprio cadastro. Nesse caso o motivo verdadeiro é o vínculo
 * que já existe, e é isso que o administrador precisa ler.
 */
async function mapCreationViolation(
  error: unknown,
  sellerId: string,
): Promise<SellerAccessCreationResult> {
  const violation = findDatabaseViolation(error);

  if (violation?.code === "23505") {
    if (violation.constraint === "users_seller_id_unique") {
      return { status: "access-already-exists" };
    }

    if (violation.constraint === "users_email_unique") {
      const existing = await sellerAccessRepository.findBySellerId(sellerId);

      return existing
        ? { status: "access-already-exists" }
        : { status: "email-in-use" };
    }
  }

  if (violation?.code === "23503") {
    return { status: "seller-not-found" };
  }

  throw error;
}

export const sellerAccessRepository: SellerAccessRepository = {
  async findSellerIdentityById(sellerId) {
    const [seller] = await db
      .select({
        id: sellers.id,
        name: sellers.name,
        email: sellers.email,
      })
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);

    return seller ?? null;
  },

  async findBySellerId(sellerId) {
    const [access] = await db
      .select(SELLER_ACCESS_COLUMNS)
      .from(users)
      .where(and(eq(users.sellerId, sellerId), eq(users.role, "seller")))
      .limit(1);

    return access?.sellerId ? { ...access, sellerId: access.sellerId } : null;
  },

  async createSellerAccess(access) {
    try {
      const [created] = await db
        .insert(users)
        .values({
          name: access.name,
          email: access.email,
          passwordHash: access.passwordHash,
          role: "seller",
          sellerId: access.sellerId,
          active: true,
        })
        .returning(SELLER_ACCESS_COLUMNS);

      return {
        status: "created",
        access: { ...created, sellerId: access.sellerId },
      };
    } catch (error) {
      return mapCreationViolation(error, access.sellerId);
    }
  },

  async setSellerAccessActive(sellerId, active) {
    return db.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(users)
        .set({ active, updatedAt: new Date() })
        .where(and(eq(users.sellerId, sellerId), eq(users.role, "seller")))
        .returning(SELLER_ACCESS_COLUMNS);

      if (!updated) {
        return null;
      }

      // Bloquear encerra o que já estava aberto. A consulta de sessão também
      // confere `users.active`, então as duas defesas valem juntas.
      if (!active) {
        await transaction
          .delete(sessions)
          .where(eq(sessions.userId, updated.userId));
      }

      return { ...updated, sellerId };
    });
  },
};
