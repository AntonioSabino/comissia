import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Os testes de integração têm o seu próprio comando, para que `npm run
    // test` continue rodando sem PostgreSQL.
    exclude: [...configDefaults.exclude, "**/*.db.test.ts"],
  },
});
