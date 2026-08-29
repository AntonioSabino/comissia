import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import type {
  InitialAdminCreationResult,
  InitialAdminRecord,
  InitialAdminRepository,
} from "../../application/initial-admin-repository";
import { users } from "./schema";

const INITIAL_ADMIN_LOCK_NAME = "comissia:create-initial-admin";

export class PostgresInitialAdminRepository implements InitialAdminRepository {
  async createInitialAdmin(
    admin: InitialAdminRecord,
  ): Promise<InitialAdminCreationResult> {
    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${INITIAL_ADMIN_LOCK_NAME}))`,
      );

      const [existingAdmin] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

      if (existingAdmin) {
        return { status: "admin-already-exists" };
      }

      const [existingUser] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(sql<string>`lower(${users.email})`, admin.email))
        .limit(1);

      if (existingUser) {
        return { status: "email-in-use" };
      }

      const [createdAdmin] = await transaction
        .insert(users)
        .values(admin)
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
        });

      if (!createdAdmin) {
        throw new Error("Não foi possível criar o usuário administrador");
      }

      return { status: "created", admin: createdAdmin };
    });
  }
}
