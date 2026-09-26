import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { sellerCommissionRates, sellers } from "@/modules/sellers";
import { validateSaleRegistration } from "../../domain/sale-registration";
import { saleRepository } from "./sale-repository";
import { sellerCommissionRepository } from "./seller-commission-repository";
import { administratorInstallmentRules, administrators } from "./schema";

/**
 * A garantia de isolamento do vendedor mora no `where` das consultas, então ela
 * só se prova contra um banco de verdade. Cada caso pergunta pelo vendedor A
 * tentando alcançar dado do vendedor B, que é o que uma URL editada à mão faz.
 *
 * O banco é descartável e recriado a cada execução pelo `vitest.db.setup`, o
 * que dispensa limpar no fim — e é o que torna estes testes repetíveis, já que
 * o histórico de situação das parcelas é append-only por gatilho.
 */

const SOLD_ON = "2026-03-10";
const FIRST_DUE_ON = "2026-04-10";
// A régua é o teto: a administradora paga 4% à corretora, o vendedor leva 3%.
const RULE_RATES = [200, 200];
const SELLER_RATE = 300;

type Fixture = {
  sellerId: string;
  administratorId: string;
  saleId: string;
  saleCode: string;
};

const suffix = randomUUID().slice(0, 8);

function digits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

async function createAdministratorWithRule(label: string): Promise<string> {
  const [administrator] = await db
    .insert(administrators)
    .values({ name: `Administradora ${label} ${suffix}` })
    .returning({ id: administrators.id });

  await db.insert(administratorInstallmentRules).values({
    administratorId: administrator.id,
    product: `Produto ${label} ${suffix}`,
    effectiveFrom: "2020-01-01",
    installmentRatesBasisPoints: RULE_RATES,
  });

  return administrator.id;
}

async function createSellerWithRate(label: string): Promise<string> {
  const [seller] = await db
    .insert(sellers)
    .values({
      name: `Vendedor ${label} ${suffix}`,
      document: digits(11),
      email: `vendedor-${label.toLowerCase()}-${suffix}@exemplo.test`,
    })
    .returning({ id: sellers.id });

  await db.insert(sellerCommissionRates).values({
    sellerId: seller.id,
    rateBasisPoints: SELLER_RATE,
    effectiveFrom: "2020-01-01",
  });

  return seller.id;
}

async function createFixture(label: string): Promise<Fixture> {
  const administratorId = await createAdministratorWithRule(label);
  const sellerId = await createSellerWithRate(label);

  const registration = validateSaleRegistration(
    {
      administratorId,
      sellerId,
      customerName: `Cliente ${label} ${suffix}`,
      product: `Produto ${label} ${suffix}`,
      groupCode: `G${digits(4)}`,
      quotaCode: digits(3),
      soldOn: SOLD_ON,
      creditAmount: "120.000,00",
      firstInstallmentDueOn: FIRST_DUE_ON,
    },
    SOLD_ON,
  );

  const result =
    await saleRepository.createWithCommissionSnapshot(registration);

  if (result.status !== "created") {
    throw new Error(
      `A venda de apoio não foi criada: ${JSON.stringify(result)}`,
    );
  }

  return {
    sellerId,
    administratorId,
    saleId: result.id,
    saleCode: result.code,
  };
}

describe("isolamento dos dados do vendedor", () => {
  let first: Fixture;
  let second: Fixture;

  beforeAll(async () => {
    first = await createFixture("A");
    second = await createFixture("B");
  }, 30_000);

  it("a listagem devolve a venda do próprio vendedor e nenhuma do outro", async () => {
    const list = await sellerCommissionRepository.listSales(first.sellerId);
    const codes = list.map((sale) => sale.code);

    expect(codes).toContain(first.saleCode);
    expect(codes).not.toContain(second.saleCode);
  });

  it("buscar pelo código do outro vendedor não alcança a venda dele", async () => {
    // É o que uma URL editada à mão faz: o filtro só consegue estreitar.
    const list = await sellerCommissionRepository.listSales(first.sellerId, {
      search: second.saleCode,
    });

    expect(list).toEqual([]);
  });

  it("filtrar pela administradora do outro vendedor não devolve nada", async () => {
    const list = await sellerCommissionRepository.listSales(first.sellerId, {
      administratorId: second.administratorId,
    });

    expect(list).toEqual([]);
  });

  it("as parcelas listadas vêm apenas das vendas do próprio vendedor", async () => {
    const installments = await sellerCommissionRepository.listInstallments(
      first.sellerId,
    );
    const saleCodes = new Set(
      installments.map((installment) => installment.saleCode),
    );

    expect(saleCodes).toContain(first.saleCode);
    expect(saleCodes).not.toContain(second.saleCode);
  });

  it("a venda do outro vendedor é não encontrada, e não negada", async () => {
    const own = await sellerCommissionRepository.findSale(
      first.saleId,
      first.sellerId,
    );
    const other = await sellerCommissionRepository.findSale(
      second.saleId,
      first.sellerId,
    );

    expect(own?.code).toBe(first.saleCode);
    // Nulo, e não um erro de permissão: trocar o identificador na URL não
    // confirma que aquela venda existe.
    expect(other).toBeNull();
  });

  it("o filtro de administradora só oferece as do próprio vendedor", async () => {
    const options = await sellerCommissionRepository.listSaleAdministrators(
      first.sellerId,
    );
    const ids = options.map((administrator) => administrator.id);

    expect(ids).toContain(first.administratorId);
    expect(ids).not.toContain(second.administratorId);
  });

  it("um vendedor sem vendas não enxerga nada", async () => {
    const strangerId = await createSellerWithRate("C");

    await expect(
      sellerCommissionRepository.listSales(strangerId),
    ).resolves.toEqual([]);
    await expect(
      sellerCommissionRepository.listInstallments(strangerId),
    ).resolves.toEqual([]);
    await expect(
      sellerCommissionRepository.listSaleAdministrators(strangerId),
    ).resolves.toEqual([]);
    await expect(
      sellerCommissionRepository.findSale(first.saleId, strangerId),
    ).resolves.toBeNull();
  });
});
