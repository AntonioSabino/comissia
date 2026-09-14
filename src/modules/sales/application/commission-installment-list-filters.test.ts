import { describe, expect, it } from "vitest";
import {
  hasCommissionInstallmentListFilters,
  parseCommissionInstallmentListFilters,
} from "./commission-installment-list-filters";

const SELLER_ID = "fe61522d-5091-4907-8b0c-498cdf956ef4";

describe("commission installment list filters", () => {
  it("devolve um recorte vazio quando nada é informado", () => {
    const filters = parseCommissionInstallmentListFilters({});

    expect(filters).toEqual({
      from: "",
      to: "",
      seller: "",
      status: "all",
    });
    expect(hasCommissionInstallmentListFilters(filters)).toBe(false);
  });

  it("combina período de competência, vendedor e situação", () => {
    const filters = parseCommissionInstallmentListFilters({
      from: "2026-01",
      to: "2026-03",
      seller: SELLER_ID,
      status: "programada",
    });

    expect(filters).toEqual({
      from: "2026-01",
      to: "2026-03",
      seller: SELLER_ID,
      status: "programada",
      competenceFrom: "2026-01",
      competenceTo: "2026-03",
      sellerId: SELLER_ID,
      installmentStatus: "programada",
    });
    expect(hasCommissionInstallmentListFilters(filters)).toBe(true);
  });

  it("ordena um período informado ao contrário", () => {
    expect(
      parseCommissionInstallmentListFilters({
        from: "2026-12",
        to: "2026-02",
      }),
    ).toMatchObject({
      from: "2026-02",
      to: "2026-12",
      competenceFrom: "2026-02",
      competenceTo: "2026-12",
    });
  });

  it("aceita apenas um dos extremos do período", () => {
    expect(
      parseCommissionInstallmentListFilters({ from: "2026-04" }),
    ).toMatchObject({
      from: "2026-04",
      to: "",
      competenceFrom: "2026-04",
    });
    expect(
      parseCommissionInstallmentListFilters({ to: "2026-04" }),
    ).toMatchObject({
      from: "",
      to: "2026-04",
      competenceTo: "2026-04",
    });
  });

  it("descarta parâmetros inválidos ou repetidos", () => {
    const filters = parseCommissionInstallmentListFilters({
      from: "2026-13",
      to: ["2026-01", "2026-02"],
      seller: "1 OR 1=1",
      status: "quitada",
    });

    expect(filters).toEqual({
      from: "",
      to: "",
      seller: "",
      status: "all",
    });
    expect(hasCommissionInstallmentListFilters(filters)).toBe(false);
  });
});
