import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { sellers, userRoleEnum, users } from "./schema";

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
