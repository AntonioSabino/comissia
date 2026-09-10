import { describe, expect, it } from "vitest";
import { findDatabaseViolation } from "./database-violation";

describe("findDatabaseViolation", () => {
  it("lê o código e a restrição do erro do driver", () => {
    const driverError = {
      code: "23505",
      constraint: "administrators_name_unique",
    };

    expect(findDatabaseViolation(driverError)).toBe(driverError);
  });

  it("encontra a violação dentro do erro encapsulado pelo Drizzle", () => {
    const driverError = { code: "23503", constraint: "sales_fk" };
    const drizzleError = new Error("Failed query", { cause: driverError });

    expect(findDatabaseViolation(drizzleError)).toBe(driverError);
  });

  it("devolve null quando não há violação do banco", () => {
    expect(findDatabaseViolation(new Error("falha genérica"))).toBeNull();
    expect(findDatabaseViolation("texto")).toBeNull();
    expect(findDatabaseViolation(null)).toBeNull();
  });
});
