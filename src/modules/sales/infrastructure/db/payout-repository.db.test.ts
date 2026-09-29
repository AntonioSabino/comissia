import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { PAYOUT_PAYMENT, PAYOUT_REVIEW } from "@/modules/commissions";
import { sellerCommissionRates, sellers } from "@/modules/sellers";
import { validateSaleRegistration } from "../../domain/sale-registration";
import { adminCommissionRepository } from "./admin-commission-repository";
import { payoutRepository } from "./payout-repository";
import { saleRepository } from "./sale-repository";
import {
  administratorInstallmentRules,
  administrators,
  commissionInstallments,
  commissionInstallmentStatusEvents,
} from "./schema";

/**
 * O fechamento grava eventos num histórico que só aceita inclusão, e a posição
 * de cada evento é calculada a partir do que já está gravado. Por isso a
 * garantia contra duas conferências simultâneas só se prova no banco.
 */

const SOLD_ON = "2026-03-10";
// Primeira previsão em abril: as parcelas caem em 2026-04, 2026-05 e 2026-06.
const FIRST_DUE_ON = "2026-04-10";
const RULE_RATES = [200, 200, 200];
const SELLER_RATE = 300;

const suffix = randomUUID().slice(0, 8);

function digits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

async function createSale(label: string): Promise<{ sellerId: string }> {
  const [administrator] = await db
    .insert(administrators)
    .values({ name: `Administradora repasse ${label} ${suffix}` })
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
      name: `Vendedor repasse ${label} ${suffix}`,
      document: digits(11),
      email: `repasse-${label.toLowerCase()}-${suffix}@exemplo.test`,
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

  return { sellerId: seller.id };
}

async function statusesOf(sellerId: string, competence: string) {
  const installments = await adminCommissionRepository.listInstallments({
    sellerId,
    competenceFrom: competence,
    competenceTo: competence,
  });

  return installments.map((installment) => installment.status);
}

describe("fechamento dos repasses", () => {
  let first: { sellerId: string };
  let second: { sellerId: string };

  beforeAll(async () => {
    first = await createSale("A");
    second = await createSale("B");
  }, 30_000);

  it("programa as previstas da competência e registra o evento na sequência", async () => {
    const result = await payoutRepository.advance({
      competence: "2026-04",
      transition: PAYOUT_REVIEW,
      changedAt: new Date(),
    });

    // Pode haver parcelas de outros testes na mesma competência; as duas
    // vendas deste arquivo estão nelas.
    expect(result.installments).toBeGreaterThanOrEqual(2);
    expect(await statusesOf(first.sellerId, "2026-04")).toEqual(["programada"]);
    expect(await statusesOf(second.sellerId, "2026-04")).toEqual([
      "programada",
    ]);
    // A competência seguinte não é tocada.
    expect(await statusesOf(first.sellerId, "2026-05")).toEqual(["prevista"]);

    const [installment] = await db
      .select({ id: commissionInstallments.id })
      .from(commissionInstallments)
      .innerJoin(
        commissionInstallmentStatusEvents,
        eq(
          commissionInstallmentStatusEvents.installmentId,
          commissionInstallments.id,
        ),
      )
      .where(eq(commissionInstallmentStatusEvents.status, "programada"))
      .limit(1);
    const events = await db
      .select({
        sequence: commissionInstallmentStatusEvents.sequence,
        previousStatus: commissionInstallmentStatusEvents.previousStatus,
        status: commissionInstallmentStatusEvents.status,
      })
      .from(commissionInstallmentStatusEvents)
      .where(
        eq(commissionInstallmentStatusEvents.installmentId, installment.id),
      )
      .orderBy(asc(commissionInstallmentStatusEvents.sequence));

    expect(events).toEqual([
      { sequence: 1, previousStatus: null, status: "prevista" },
      { sequence: 2, previousStatus: "prevista", status: "programada" },
    ]);
  });

  it("não muda nada ao conferir de novo", async () => {
    await expect(
      payoutRepository.advance({
        competence: "2026-04",
        transition: PAYOUT_REVIEW,
        changedAt: new Date(),
      }),
    ).resolves.toEqual({ installments: 0, totalInCents: BigInt(0) });
  });

  it("paga somente o vendedor informado", async () => {
    const result = await payoutRepository.advance({
      competence: "2026-04",
      sellerId: first.sellerId,
      transition: PAYOUT_PAYMENT,
      changedAt: new Date(),
    });

    expect(result.installments).toBe(1);
    expect(result.totalInCents).toBeGreaterThan(BigInt(0));
    expect(await statusesOf(first.sellerId, "2026-04")).toEqual(["paga"]);
    expect(await statusesOf(second.sellerId, "2026-04")).toEqual([
      "programada",
    ]);
  });

  it("não paga parcela que ainda não foi conferida", async () => {
    await expect(
      payoutRepository.advance({
        competence: "2026-05",
        sellerId: first.sellerId,
        transition: PAYOUT_PAYMENT,
        changedAt: new Date(),
      }),
    ).resolves.toEqual({ installments: 0, totalInCents: BigInt(0) });
    expect(await statusesOf(first.sellerId, "2026-05")).toEqual(["prevista"]);
  });

  it("aceita duas conferências simultâneas sem duplicar o evento", async () => {
    const [one, other] = await Promise.all([
      payoutRepository.advance({
        competence: "2026-06",
        transition: PAYOUT_REVIEW,
        changedAt: new Date(),
      }),
      payoutRepository.advance({
        competence: "2026-06",
        transition: PAYOUT_REVIEW,
        changedAt: new Date(),
      }),
    ]);

    // Uma das duas programa tudo; a outra espera a trava e não acha previstas.
    expect(Math.min(one.installments, other.installments)).toBe(0);
    expect(await statusesOf(first.sellerId, "2026-06")).toEqual(["programada"]);
    expect(await statusesOf(second.sellerId, "2026-06")).toEqual([
      "programada",
    ]);
  });
});
