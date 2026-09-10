import { describe, expect, it } from "vitest";
import { findRateValidOn } from "./commission-rate-on-date";

const january = {
  id: "jan",
  rateBasisPoints: 250,
  effectiveFrom: "2026-01-10",
};
const june = { id: "jun", rateBasisPoints: 300, effectiveFrom: "2026-06-01" };
const december = {
  id: "dez",
  rateBasisPoints: 400,
  effectiveFrom: "2026-12-01",
};

describe("findRateValidOn", () => {
  it("escolhe a vigência de maior início que não ultrapassa a data", () => {
    expect(findRateValidOn([january, june, december], "2026-09-10")).toBe(june);
  });

  it("não depende da ordem da lista", () => {
    expect(findRateValidOn([december, january, june], "2026-09-10")).toBe(june);
  });

  it("considera válida a vigência que começa na própria data", () => {
    expect(findRateValidOn([january, june], "2026-06-01")).toBe(june);
  });

  it("ignora vigências futuras", () => {
    expect(findRateValidOn([january, december], "2026-11-30")).toBe(january);
  });

  it("não encontra percentual antes da primeira vigência", () => {
    expect(findRateValidOn([january, june], "2026-01-09")).toBeNull();
    expect(findRateValidOn([], "2026-09-10")).toBeNull();
  });

  it("mantém o percentual de uma venda antiga quando surge vigência nova", () => {
    const saleDate = "2026-03-15";

    expect(findRateValidOn([january], saleDate)).toBe(january);
    expect(findRateValidOn([january, june, december], saleDate)).toBe(january);
  });
});
