import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { sellers } from "./schema";

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
});
