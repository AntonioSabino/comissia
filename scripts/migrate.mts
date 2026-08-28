import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi definida em .env.local");
}

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

async function runMigrations() {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle(pool);

  try {
    await migrate(database, { migrationsFolder });
    console.log("Migrações aplicadas com sucesso.");
  } finally {
    await pool.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error("Falha ao aplicar as migrações.");
  console.error(error);
  process.exitCode = 1;
});
