import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readMigration(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../drizzle/${name}.sql`, import.meta.url)),
    "utf8",
  );
}

const appendOnlyCommissionRatesSql = readMigration(
  "0004_append_only_commission_rates",
);
const installmentRulesSql = readMigration(
  "0008_administrator_installment_rules",
);
const appendOnlyInstallmentRulesSql = readMigration(
  "0009_append_only_installment_rules",
);
const quotaStatusHistorySql = readMigration("0013_sale_quota_status_history");

describe("database migrations", () => {
  it("enforces append-only seller commission rate history", () => {
    expect(appendOnlyCommissionRatesSql).toContain(
      'CREATE TRIGGER "seller_commission_rates_append_only"',
    );
    expect(appendOnlyCommissionRatesSql).toContain(
      'BEFORE UPDATE OR DELETE ON "seller_commission_rates"',
    );
    expect(appendOnlyCommissionRatesSql).toContain(
      "RAISE EXCEPTION 'seller_commission_rates is append-only'",
    );
  });

  it("keeps one effective date per administrator and product", () => {
    expect(installmentRulesSql).toContain(
      'CREATE UNIQUE INDEX "administrator_installment_rules_effective_from_unique" ON "administrator_installment_rules" USING btree ("administrator_id",lower("product"),"effective_from")',
    );
  });

  it("bounds the administrator installment distribution", () => {
    const rates =
      '"administrator_installment_rules"."installment_rates_basis_points"';

    expect(installmentRulesSql).toContain(
      `coalesce(array_length(${rates}, 1), 0) BETWEEN 1 AND 120`,
    );
    expect(installmentRulesSql).toContain(`array_ndims(${rates}) = 1`);
    expect(installmentRulesSql).toContain(
      `array_position(${rates}, NULL) IS NULL`,
    );
    expect(installmentRulesSql).toContain(`1 <= ALL (${rates})`);
    expect(installmentRulesSql).toContain(`10000 >= ALL (${rates})`);
  });

  it("enforces append-only administrator installment rules", () => {
    expect(appendOnlyInstallmentRulesSql).toContain(
      'CREATE TRIGGER "administrator_installment_rules_append_only"',
    );
    expect(appendOnlyInstallmentRulesSql).toContain(
      'BEFORE UPDATE OR DELETE ON "administrator_installment_rules"',
    );
    expect(appendOnlyInstallmentRulesSql).toContain(
      "RAISE EXCEPTION 'administrator_installment_rules is append-only'",
    );
  });

  it("backfills and records every quota situation change", () => {
    expect(quotaStatusHistorySql).toContain(
      'INSERT INTO "sale_quota_status_events"',
    );
    expect(quotaStatusHistorySql).toContain(
      'CREATE TRIGGER "sales_initial_quota_status_event"',
    );
    expect(quotaStatusHistorySql).toContain(
      'CREATE TRIGGER "sales_quota_status_changed_event"',
    );
    expect(quotaStatusHistorySql).toContain(
      'OLD."quota_status" IS DISTINCT FROM NEW."quota_status"',
    );
  });

  it("keeps quota situation events append-only", () => {
    expect(quotaStatusHistorySql).toContain(
      'CREATE TRIGGER "sale_quota_status_events_append_only"',
    );
    expect(quotaStatusHistorySql).toContain(
      'BEFORE UPDATE OR DELETE ON "sale_quota_status_events"',
    );
    expect(quotaStatusHistorySql).toContain(
      "RAISE EXCEPTION 'sale_quota_status_events is append-only'",
    );
  });
});
