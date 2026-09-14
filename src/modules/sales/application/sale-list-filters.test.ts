import { describe, expect, it } from "vitest";
import {
  hasSaleListFilters,
  hasSellerSaleListFilters,
  parseSaleListFilters,
  parseSellerSaleListFilters,
  type SellerSaleListSearchParams,
} from "./sale-list-filters";

const SELLER_ID = "7b5b0f3c-5f3f-4a1a-9a4f-2b1f0a5a1c11";
const ADMINISTRATOR_ID = "3f1a9c2e-8d4b-4c6f-9f2a-1d7e5b3c9a02";

describe("sale list filters", () => {
  it("devolve filtros vazios quando nada é informado", () => {
    const filters = parseSaleListFilters({});

    expect(filters).toEqual({
      search: "",
      seller: "",
      administrator: "",
      status: "all",
      from: "",
      to: "",
    });
    expect(hasSaleListFilters(filters)).toBe(false);
  });

  it("combina busca, vendedor, administradora, situação e período", () => {
    const filters = parseSaleListFilters({
      search: "  V-000001  ",
      seller: SELLER_ID,
      administrator: ADMINISTRATOR_ID,
      status: "contemplado",
      from: "2026-01-01",
      to: "2026-03-31",
    });

    expect(filters).toEqual({
      search: "V-000001",
      seller: SELLER_ID,
      administrator: ADMINISTRATOR_ID,
      status: "contemplado",
      from: "2026-01-01",
      to: "2026-03-31",
      sellerId: SELLER_ID,
      administratorId: ADMINISTRATOR_ID,
      quotaStatus: "contemplado",
      soldFrom: "2026-01-01",
      soldTo: "2026-03-31",
    });
    expect(hasSaleListFilters(filters)).toBe(true);
  });

  it("ignora identificadores que não são UUID", () => {
    const filters = parseSaleListFilters({
      seller: "1 OR 1=1",
      administrator: "",
    });

    expect(filters.seller).toBe("");
    expect(filters).not.toHaveProperty("sellerId");
    expect(hasSaleListFilters(filters)).toBe(false);
  });

  it("ignora situação da cota desconhecida", () => {
    const filters = parseSaleListFilters({ status: "quitado" });

    expect(filters.status).toBe("all");
    expect(filters).not.toHaveProperty("quotaStatus");
  });

  it("ignora datas fora do calendário ou do formato AAAA-MM-DD", () => {
    const filters = parseSaleListFilters({
      from: "2026-02-30",
      to: "31/03/2026",
    });

    expect(filters.from).toBe("");
    expect(filters.to).toBe("");
    expect(filters).not.toHaveProperty("soldFrom");
    expect(filters).not.toHaveProperty("soldTo");
  });

  it("ordena um período informado ao contrário", () => {
    const filters = parseSaleListFilters({
      from: "2026-03-31",
      to: "2026-01-01",
    });

    expect(filters.from).toBe("2026-01-01");
    expect(filters.to).toBe("2026-03-31");
    expect(filters.soldFrom).toBe("2026-01-01");
    expect(filters.soldTo).toBe("2026-03-31");
  });

  it("aceita apenas um dos extremos do período", () => {
    expect(parseSaleListFilters({ from: "2026-01-01" })).toMatchObject({
      from: "2026-01-01",
      to: "",
      soldFrom: "2026-01-01",
    });
    expect(parseSaleListFilters({ to: "2026-01-01" })).toMatchObject({
      from: "",
      to: "2026-01-01",
      soldTo: "2026-01-01",
    });
  });

  it("descarta parâmetros repetidos na query string", () => {
    const filters = parseSaleListFilters({
      search: ["primeiro", "segundo"],
      status: ["cancelado", "adimplente"],
    });

    expect(filters.search).toBe("");
    expect(filters.status).toBe("all");
  });

  it("limita o tamanho da busca", () => {
    const filters = parseSaleListFilters({ search: "a".repeat(200) });

    expect(filters.search).toHaveLength(160);
  });
});

describe("seller sale list filters", () => {
  it("devolve filtros vazios quando nada é informado", () => {
    const filters = parseSellerSaleListFilters({});

    expect(filters).toEqual({
      search: "",
      administrator: "",
      status: "all",
      from: "",
      to: "",
    });
    expect(hasSellerSaleListFilters(filters)).toBe(false);
  });

  it("combina busca, administradora, situação e período", () => {
    const filters = parseSellerSaleListFilters({
      search: "  V-000001  ",
      administrator: ADMINISTRATOR_ID,
      status: "contemplado",
      from: "2026-01-01",
      to: "2026-03-31",
    });

    expect(filters).toEqual({
      search: "V-000001",
      administrator: ADMINISTRATOR_ID,
      status: "contemplado",
      from: "2026-01-01",
      to: "2026-03-31",
      administratorId: ADMINISTRATOR_ID,
      quotaStatus: "contemplado",
      soldFrom: "2026-01-01",
      soldTo: "2026-03-31",
    });
    expect(hasSellerSaleListFilters(filters)).toBe(true);
  });

  it("não aceita um vendedor pela query string", () => {
    // A rota entrega a query string inteira; um `seller` colado ali não tem
    // onde encostar, porque o tipo dos filtros do vendedor não tem esse campo.
    const filters = parseSellerSaleListFilters({
      seller: SELLER_ID,
    } as SellerSaleListSearchParams);

    expect(filters).not.toHaveProperty("seller");
    expect(filters).not.toHaveProperty("sellerId");
    expect(hasSellerSaleListFilters(filters)).toBe(false);
  });

  it("aplica as mesmas limpezas da listagem da administração", () => {
    const filters = parseSellerSaleListFilters({
      search: "a".repeat(200),
      administrator: "1 OR 1=1",
      status: "quitado",
      from: "2026-03-31",
      to: "2026-01-01",
    });

    expect(filters.search).toHaveLength(160);
    expect(filters.administrator).toBe("");
    expect(filters.status).toBe("all");
    expect(filters.from).toBe("2026-01-01");
    expect(filters.to).toBe("2026-03-31");
  });
});
