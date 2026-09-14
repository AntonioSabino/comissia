import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Prepara o banco descartável dos testes de integração: derruba, recria e
 * aplica as migrações. Recriar em vez de limpar é o que torna estes testes
 * repetíveis — o histórico de situação das parcelas é append-only por gatilho,
 * de propósito, então uma trilha de auditoria não se apaga no fim do teste.
 */
export async function setup() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não foi definida");
  }

  const url = new URL(databaseUrl);
  const databaseName = url.pathname.slice(1);

  // Trava de segurança: este arquivo derruba um banco. Só age em um cujo nome
  // termina em `_test`, nome que só o vitest.db.config monta.
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Os testes de integração só rodam em um banco terminado em _test; recebido: ${databaseName}`,
    );
  }

  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = "/postgres";

  const maintenance = new Pool({ connectionString: maintenanceUrl.toString() });

  try {
    await maintenance.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await maintenance.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await maintenance.end();
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(new URL("./drizzle", import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}
