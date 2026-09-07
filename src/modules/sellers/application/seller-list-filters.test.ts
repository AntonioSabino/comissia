import { describe, expect, it } from "vitest";
import { parseSellerListFilters } from "./seller-list-filters";

describe("parseSellerListFilters", () => {
  it("normaliza a busca e mantém todos os status por padrão", () => {
    expect(
      parseSellerListFilters({
        search: "  Maria Silva  ",
        status: "unexpected",
      }),
    ).toEqual({
      search: "Maria Silva",
      status: "all",
    });
  });

  it("converte o filtro de situação para o repositório", () => {
    expect(parseSellerListFilters({ status: "active" })).toEqual({
      search: "",
      status: "active",
      active: true,
    });

    expect(parseSellerListFilters({ status: "inactive" })).toEqual({
      search: "",
      status: "inactive",
      active: false,
    });
  });

  it("ignora parâmetros repetidos em vez de escolher um valor arbitrário", () => {
    expect(
      parseSellerListFilters({
        search: ["Maria", "João"],
        status: ["active", "inactive"],
      }),
    ).toEqual({
      search: "",
      status: "all",
    });
  });
});
