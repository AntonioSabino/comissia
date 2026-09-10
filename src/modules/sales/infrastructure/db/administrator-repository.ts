import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { findDatabaseViolation } from "@/db/database-violation";
import type { AdministratorRepository } from "../../application/administrator-repository";
import { DuplicateAdministratorError } from "../../application/errors";
import { administrators } from "./schema";

function mapUniqueViolation(error: unknown): never {
  const violation = findDatabaseViolation(error);

  if (
    violation?.code === "23505" &&
    violation.constraint === "administrators_name_unique"
  ) {
    throw new DuplicateAdministratorError();
  }

  throw error;
}

export const administratorRepository: AdministratorRepository = {
  async isNameInUse(name) {
    const [administrator] = await db
      .select({ id: administrators.id })
      .from(administrators)
      .where(sql`lower(${administrators.name}) = lower(${name})`)
      .limit(1);

    return Boolean(administrator);
  },

  async create(name) {
    try {
      const [administrator] = await db
        .insert(administrators)
        .values({ name })
        .returning({ id: administrators.id });

      return administrator;
    } catch (error) {
      return mapUniqueViolation(error);
    }
  },

  async list(filters = {}) {
    return db
      .select({
        id: administrators.id,
        name: administrators.name,
        active: administrators.active,
      })
      .from(administrators)
      .where(
        filters.active === undefined
          ? undefined
          : eq(administrators.active, filters.active),
      )
      .orderBy(asc(administrators.name));
  },

  async setActive(id, active) {
    const [administrator] = await db
      .update(administrators)
      .set({ active, updatedAt: new Date() })
      .where(eq(administrators.id, id))
      .returning({ id: administrators.id });

    return Boolean(administrator);
  },
};
