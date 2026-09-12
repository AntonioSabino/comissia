import { describe, expect, it } from "vitest";
import { selectActiveSellersForSale } from "./active-sellers-for-sale";
import type { SellerListItem } from "./seller-repository";

function sellerItem(name: string, active: boolean): SellerListItem {
  return {
    id: `${name}-id`,
    name,
    document: "52998224725",
    email: `${name}@exemplo.test`,
    active,
    rateBasisPoints: 150,
    effectiveFrom: "2026-01-01",
  };
}

describe("selectActiveSellersForSale", () => {
  it("mantém exclusivamente vendedores ativos", () => {
    const sellers = [
      sellerItem("ana", true),
      sellerItem("bruno", false),
      sellerItem("clara", true),
    ];

    expect(selectActiveSellersForSale(sellers).map(({ name }) => name)).toEqual(
      ["ana", "clara"],
    );
  });

  it("preserva a lista recebida", () => {
    const sellers = [sellerItem("ana", true)];

    expect(selectActiveSellersForSale(sellers)).not.toBe(sellers);
    expect(sellers).toHaveLength(1);
  });

  it("devolve vazio quando nenhum vendedor está ativo", () => {
    expect(selectActiveSellersForSale([sellerItem("ana", false)])).toEqual([]);
  });
});
