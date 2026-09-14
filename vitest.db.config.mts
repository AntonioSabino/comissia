import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Os testes de integração leem a mesma instância do PostgreSQL usada no
// desenvolvimento. No CI a variável já vem do ambiente, e o dotenv não
// sobrescreve o que existe.
config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi definida");
}

/**
 * Nunca o banco de desenvolvimento: os testes recebem um banco próprio, com o
 * sufixo `_test`, que o `vitest.db.setup` derruba e recria a cada execução.
 */
const testDatabaseUrl = new URL(databaseUrl);
testDatabaseUrl.pathname = `${testDatabaseUrl.pathname.replace(/\/$/, "")}_test`;
process.env.DATABASE_URL = testDatabaseUrl.toString();

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts", "scripts/**/*.db.test.ts"],
    globalSetup: ["./vitest.db.setup.mts"],
    // Um banco só: arquivos que criam dados não podem correr em paralelo.
    fileParallelism: false,
  },
});
