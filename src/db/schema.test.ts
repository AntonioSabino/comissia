import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  administratorInstallmentRules,
  administrators,
  commissionInstallments,
  commissionInstallmentStatusEnum,
  commissionInstallmentStatusEvents,
  quotaStatusEnum,
  saleQuotaStatusEvents,
  sales,
  sellerCommissionRates,
  sellers,
  sessions,
  userRoleEnum,
  users,
} from "./schema";

describe("database schema", () => {
  it("defines the initial sellers table", () => {
    const table = getTableConfig(sellers);

    expect(table.name).toBe("sellers");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "name",
      "document",
      "email",
      "phone",
      "active",
      "created_at",
      "updated_at",
    ]);
  });

  it("keeps seller commission rates as dated history", () => {
    const table = getTableConfig(sellerCommissionRates);

    expect(table.name).toBe("seller_commission_rates");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "seller_id",
      "rate_basis_points",
      "effective_from",
      "created_at",
    ]);
    expect(table.foreignKeys).toHaveLength(1);
    expect(
      table.uniqueConstraints.map((constraint) => constraint.name),
    ).toEqual(
      expect.arrayContaining([
        "seller_commission_rates_id_seller_rate_unique",
        "seller_commission_rates_seller_effective_from_unique",
      ]),
    );
    expect(table.checks.map((constraint) => constraint.name)).toContain(
      "seller_commission_rates_rate_basis_points_check",
    );
  });

  it("defines revocable sessions", () => {
    const table = getTableConfig(sessions);

    expect(table.name).toBe("sessions");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "user_id",
      "token_hash",
      "expires_at",
      "created_at",
    ]);
    expect(table.foreignKeys).toHaveLength(1);
  });

  it("persists the supported access profiles", () => {
    expect(userRoleEnum.enumValues).toEqual(["admin", "seller"]);
  });

  it("defines users with a unique seller association", () => {
    const table = getTableConfig(users);

    expect(table.name).toBe("users");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "name",
      "email",
      "password_hash",
      "role",
      "seller_id",
      "active",
      "created_at",
      "updated_at",
    ]);
    expect(
      table.uniqueConstraints.map((constraint) => constraint.name),
    ).toContain("users_seller_id_unique");
    expect(table.foreignKeys).toHaveLength(1);
    expect(table.checks.map((constraint) => constraint.name)).toContain(
      "users_role_seller_link_check",
    );
  });

  it("defines administrators with a case-insensitive unique name", () => {
    const table = getTableConfig(administrators);

    expect(table.name).toBe("administrators");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "name",
      "active",
      "created_at",
      "updated_at",
    ]);
    expect(
      table.indexes.map((index) => ({
        name: index.config.name,
        unique: index.config.unique,
      })),
    ).toEqual([{ name: "administrators_name_lower_unique", unique: true }]);
  });

  it("keeps administrator installment rules as dated versions", () => {
    const table = getTableConfig(administratorInstallmentRules);

    expect(table.name).toBe("administrator_installment_rules");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "administrator_id",
      "product",
      "effective_from",
      "installment_rates_basis_points",
      "created_at",
    ]);
    expect(table.foreignKeys).toHaveLength(1);
    expect(
      table.indexes.map((index) => ({
        name: index.config.name,
        unique: index.config.unique,
      })),
    ).toEqual([
      {
        name: "administrator_installment_rules_effective_from_unique",
        unique: true,
      },
    ]);
    expect(table.checks.map((constraint) => constraint.name).sort()).toEqual([
      "administrator_installment_rules_installments_check",
      "administrator_installment_rules_rates_check",
    ]);
    expect(
      table.uniqueConstraints.map((constraint) => constraint.name),
    ).toEqual([
      "administrator_installment_rules_id_administrator_rates_unique",
    ]);
  });

  it("stores the installment distribution as ordered basis points", () => {
    const table = getTableConfig(administratorInstallmentRules);
    const distribution = table.columns.find(
      (column) => column.name === "installment_rates_basis_points",
    );

    expect(distribution?.getSQLType()).toBe("integer[]");
    expect(distribution?.mapFromDriverValue("{75,50,25}")).toEqual([
      75, 50, 25,
    ]);
  });

  it("persists the supported quota situations", () => {
    expect(quotaStatusEnum.enumValues).toEqual([
      "adimplente",
      "inadimplente",
      "cancelado",
      "contemplado",
    ]);
  });

  it("keeps the quota situation as an append-only history", () => {
    const table = getTableConfig(saleQuotaStatusEvents);

    expect(table.name).toBe("sale_quota_status_events");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "sale_id",
      "sequence",
      "previous_status",
      "status",
      "changed_at",
      "created_at",
    ]);
    expect(table.foreignKeys).toHaveLength(1);
    expect(
      table.uniqueConstraints.map((constraint) => constraint.name),
    ).toEqual(["sale_quota_status_events_sale_sequence_unique"]);
    expect(table.checks.map((constraint) => constraint.name)).toEqual([
      "sale_quota_status_events_history_check",
    ]);
    expect(table.indexes.map((index) => index.config.name)).toEqual([
      "sale_quota_status_events_sale_changed_at_index",
    ]);
  });

  it("defines sales with the commission rate applied to them", () => {
    const table = getTableConfig(sales);

    expect(table.name).toBe("sales");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "code",
      "administrator_id",
      "administrator_installment_rule_id",
      "seller_id",
      "seller_commission_rate_id",
      "customer_name",
      "product",
      "group_code",
      "quota_code",
      "sold_on",
      "credit_amount_in_cents",
      "seller_rate_basis_points",
      "installment_rates_basis_points",
      "commission_installments",
      "first_installment_due_on",
      "quota_status",
      "created_at",
      "updated_at",
    ]);
    expect(table.foreignKeys.map((constraint) => constraint.getName())).toEqual(
      expect.arrayContaining([
        "sales_administrator_id_administrators_id_fk",
        "sales_seller_id_sellers_id_fk",
        "sales_seller_commission_snapshot_fk",
        "sales_installment_rule_snapshot_fk",
      ]),
    );
    expect(table.foreignKeys).toHaveLength(4);
    expect(
      table.columns.find((column) => column.name === "code")?.isUnique,
    ).toBe(true);
    expect(
      table.columns.find((column) => column.name === "code")?.hasDefault,
    ).toBe(true);
    expect(table.checks.map((constraint) => constraint.name).sort()).toEqual(
      [
        "sales_credit_amount_in_cents_check",
        "sales_seller_rate_basis_points_check",
        "sales_commission_installments_check",
        "sales_first_installment_due_on_check",
        "sales_installment_rule_snapshot_check",
        "sales_commission_installments_snapshot_check",
      ].sort(),
    );
    expect(
      table.indexes.map((constraint) => constraint.config.name).sort(),
    ).toEqual(["sales_seller_id_index", "sales_quota_index"].sort());
  });

  it("persists the supported installment situations", () => {
    expect(commissionInstallmentStatusEnum.enumValues).toEqual([
      "prevista",
      "programada",
      "paga",
      "cancelada",
      "ajustada",
    ]);
  });

  it("stores the generated commission installments", () => {
    const table = getTableConfig(commissionInstallments);

    expect(table.name).toBe("commission_installments");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "sale_id",
      "number",
      "competence",
      "due_on",
      "rule_rate_basis_points",
      "amount_in_cents",
      "created_at",
    ]);
    expect(table.foreignKeys).toHaveLength(1);
    expect(
      table.uniqueConstraints.map((constraint) => constraint.name),
    ).toEqual(["commission_installments_sale_number_unique"]);
    expect(table.checks.map((constraint) => constraint.name).sort()).toEqual(
      [
        "commission_installments_number_check",
        "commission_installments_competence_check",
        "commission_installments_rule_rate_basis_points_check",
        "commission_installments_amount_in_cents_check",
      ].sort(),
    );
  });

  it("stores installment amounts in cents", () => {
    const table = getTableConfig(commissionInstallments);
    const amount = table.columns.find(
      (column) => column.name === "amount_in_cents",
    );

    expect(amount?.getSQLType()).toBe("bigint");
    expect(amount?.mapFromDriverValue("9007199254740992")).toBe(
      BigInt("9007199254740992"),
    );
  });

  it("keeps the installment situation as an append-only history", () => {
    const table = getTableConfig(commissionInstallmentStatusEvents);

    expect(table.name).toBe("commission_installment_status_events");
    expect(table.columns.map((column) => column.name)).toEqual([
      "id",
      "installment_id",
      "sequence",
      "previous_status",
      "status",
      "changed_at",
      "created_at",
    ]);
    expect(table.foreignKeys).toHaveLength(1);
    expect(
      table.uniqueConstraints.map((constraint) => constraint.name),
    ).toEqual([
      "commission_installment_status_events_installment_sequence_unique",
    ]);
    expect(table.checks.map((constraint) => constraint.name).sort()).toEqual([
      "commission_installment_status_events_sequence_check",
      "commission_installment_status_events_transition_check",
    ]);
  });

  it("stores the sale credit in cents", () => {
    const table = getTableConfig(sales);
    const credit = table.columns.find(
      (column) => column.name === "credit_amount_in_cents",
    );

    expect(credit?.getSQLType()).toBe("bigint");
    expect(credit?.mapFromDriverValue("9007199254740992")).toBe(
      BigInt("9007199254740992"),
    );
  });
});
