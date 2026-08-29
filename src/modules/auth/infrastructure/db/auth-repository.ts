import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import type {
  AuthRepository,
  SessionRecord,
} from "../../application/auth-repository";
import { sessions, users } from "./schema";

export const authRepository: AuthRepository = {
  async findUserByEmail(email) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        sellerId: users.sellerId,
        active: users.active,
      })
      .from(users)
      .where(eq(sql<string>`lower(${users.email})`, email))
      .limit(1);

    return user ?? null;
  },

  async createSession(session: SessionRecord) {
    await db.insert(sessions).values(session);
  },

  async deleteSessionByTokenHash(tokenHash) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  },
};
