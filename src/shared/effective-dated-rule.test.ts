import { describe, expect, it } from "vitest";
import { findRuleValidOn } from "./effective-dated-rule";

const january = { id: "jan", effectiveFrom: "2026-01-10" };
const june = { id: "jun", effectiveFrom: "2026-06-01" };
const december = { id: "dez", effectiveFrom: "2026-12-01" };

describe("findRuleValidOn", () => {
  it("escolhe a vigência de maior início que não ultrapassa a data", () => {
    expect(findRuleValidOn([january, june, december], "2026-09-10")).toBe(june);
  });

  it("não depende da ordem da lista", () => {
    expect(findRuleValidOn([december, january, june], "2026-09-10")).toBe(june);
  });

  it("considera válida a vigência que começa na própria data", () => {
    expect(findRuleValidOn([january, june], "2026-06-01")).toBe(june);
  });

  it("ignora vigências futuras", () => {
    expect(findRuleValidOn([january, december], "2026-11-30")).toBe(january);
  });

  it("não encontra regra antes da primeira vigência", () => {
    expect(findRuleValidOn([january, june], "2026-01-09")).toBeNull();
    expect(findRuleValidOn([], "2026-09-10")).toBeNull();
  });

  it("mantém a regra de uma data antiga quando surge vigência nova", () => {
    const saleDate = "2026-03-15";

    expect(findRuleValidOn([january], saleDate)).toBe(january);
    expect(findRuleValidOn([january, june, december], saleDate)).toBe(january);
  });
});
