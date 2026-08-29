import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import type {
  InitialAdminRecord,
  InitialAdminRepository,
} from "../../application/initial-admin-repository";
import { users } from "./schema";

export class PostgresInitialAdminRepository implements InitialAdminRepository {
  async adminExists(): Promise<boolean> {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    return admin !== undefined;
  }

  async userEmailExists(email: string): Promise<boolean> {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    return user !== undefined;
  }

  async createAdmin(admin: InitialAdminRecord) {
    const [createdAdmin] = await db.insert(users).values(admin).returning({
      id: users.id,
      name: users.name,
      email: users.email,
    });

    if (!createdAdmin) {
      throw new Error("Não foi possível criar o usuário administrador");
    }

    return createdAdmin;
  }
}
