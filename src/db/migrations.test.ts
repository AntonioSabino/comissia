import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../drizzle/0003_seller_commission_rates.sql", import.meta.url),
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("database migrations", () => {
  it("enforces append-only seller commission rate history", () => {
    expect(migrationSql).toContain(
      'CREATE TRIGGER "seller_commission_rates_append_only"',
    );
    expect(migrationSql).toContain(
      'BEFORE UPDATE OR DELETE ON "seller_commission_rates"',
    );
    expect(migrationSql).toContain(
      "RAISE EXCEPTION 'seller_commission_rates is append-only'",
    );
  });
});
