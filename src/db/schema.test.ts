import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
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
    ).toContain("seller_commission_rates_seller_effective_from_unique");
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
});
