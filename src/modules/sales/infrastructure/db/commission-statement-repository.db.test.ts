import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { PAYOUT_REVIEW } from "@/modules/commissions";
import { sellerCommissionRates, sellers } from "@/modules/sellers";
import { validateSaleRegistration } from "../../domain/sale-registration";
import { buildPayoutClosing } from "../../application/payout-closing";
import { adminCommissionRepository } from "./admin-commission-repository";
import { commissionStatementRepository } from "./commission-statement-repository";
import { payoutRepository } from "./payout-repository";
import { saleRepository } from "./sale-repository";
import { administratorInstallmentRules, administrators } from "./schema";

/**
 * O demonstrativo é o documento que o vendedor leva para casa: ele precisa
 * ficar restrito ao vendedor pedido e somar exatamente como a tela de
 * repasses. As duas garantias moram na consulta, então se provam no banco.
 */

const SOLD_ON = "2026-03-10";
// As parcelas caem em 2026-04 e 2026-05.
const FIRST_DUE_ON = "2026-04-10";
const RULE_RATES = [200, 200];
const SELLER_RATE = 300;

const suffix = randomUUID().slice(0, 8);

function digits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

async function createSale(label: string): Promise<string> {
  const [administrator] = await db
    .insert(administrators)
    .values({ name: `Administradora demonstrativo ${label} ${suffix}` })
    .returning({ id: administrators.id });

  await db.insert(administratorInstallmentRules).values({
    administratorId: administrator.id,
    product: `Produto ${label} ${suffix}`,
    effectiveFrom: "2020-01-01",
    installmentRatesBasisPoints: RULE_RATES,
  });

  const [seller] = await db
    .insert(sellers)
    .values({
      name: `Vendedor demonstrativo ${label} ${suffix}`,
      document: digits(11),
      email: `demonstrativo-${label.toLowerCase()}-${suffix}@exemplo.test`,
    })
    .returning({ id: sellers.id });

  await db.insert(sellerCommissionRates).values({
    sellerId: seller.id,
    rateBasisPoints: SELLER_RATE,
    effectiveFrom: "2020-01-01",
  });

  const registration = validateSaleRegistration(
    {
      administratorId: administrator.id,
      sellerId: seller.id,
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

  return seller.id;
}

describe("demonstrativo de comissões", () => {
  let first: string;
  let second: string;

  beforeAll(async () => {
    first = await createSale("A");
    second = await createSale("B");
  }, 30_000);

  it("devolve só as parcelas do vendedor pedido, com os dados da venda", async () => {
    const installments = await commissionStatementRepository.listInstallments({
      sellerId: first,
    });

    expect(installments).toHaveLength(2);
    expect(
      installments.every((installment) => installment.sellerId === first),
    ).toBe(true);
    expect(installments[0]).toMatchObject({
      competence: "2026-04",
      number: 1,
      saleInstallments: 2,
      customerName: `Cliente A ${suffix}`,
      administratorName: `Administradora demonstrativo A ${suffix}`,
      product: `Produto A ${suffix}`,
      status: "prevista",
    });
    // Nenhum percentual chega ao demonstrativo.
    expect(Object.keys(installments[0]).join(",")).not.toMatch(/rate/i);
  });

  it("recorta pela competência sem sair do vendedor", async () => {
    const installments = await commissionStatementRepository.listInstallments({
      sellerId: second,
      competence: "2026-05",
    });

    expect(
      installments.map((installment) => [
        installment.sellerId,
        installment.competence,
      ]),
    ).toEqual([[second, "2026-05"]]);
  });

  it("soma como a tela de repasses", async () => {
    const [statement, payouts] = await Promise.all([
      commissionStatementRepository.listInstallments({ competence: "2026-04" }),
      adminCommissionRepository.listInstallments({
        competenceFrom: "2026-04",
        competenceTo: "2026-04",
      }),
    ]);
    const fromStatement = buildPayoutClosing(statement);
    const fromPayouts = buildPayoutClosing(payouts);

    expect(fromStatement.toPayInCents).toBe(fromPayouts.toPayInCents);
    expect(fromStatement.paidInCents).toBe(fromPayouts.paidInCents);
    expect(fromStatement.outsideInCents).toBe(fromPayouts.outsideInCents);
    expect(
      fromStatement.sellers.map((seller) => [
        seller.sellerId,
        seller.toPayInCents,
      ]),
    ).toEqual(
      fromPayouts.sellers.map((seller) => [
        seller.sellerId,
        seller.toPayInCents,
      ]),
    );
  });

  it("traz o instante da última mudança de situação", async () => {
    const reviewedAt = new Date();

    await payoutRepository.advance({
      competence: "2026-04",
      sellerId: first,
      transition: PAYOUT_REVIEW,
      now: () => reviewedAt,
    });

    const [installment] = await commissionStatementRepository.listInstallments({
      sellerId: first,
      competence: "2026-04",
    });

    expect(installment.status).toBe("programada");
    expect(installment.statusChangedAt).toBe(reviewedAt.toISOString());
  });
});
