import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi definida");
}

const globalForDatabase = globalThis as unknown as {
  postgresPool?: Pool;
};

export const postgresPool =
  globalForDatabase.postgresPool ?? new Pool({ connectionString: databaseUrl });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.postgresPool = postgresPool;
}

export const db = drizzle(postgresPool, { schema });
