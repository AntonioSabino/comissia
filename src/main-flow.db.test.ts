import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { authenticateSession } from "@/modules/auth/application/authenticate-session";
import { login } from "@/modules/auth/application/login";
import { createSellerAccess } from "@/modules/auth/application/seller-access";
import { authRepository } from "@/modules/auth/infrastructure/db/auth-repository";
import { sellerAccessRepository } from "@/modules/auth/infrastructure/db/seller-access-repository";
import { calculateSellerCommissionTotal } from "@/modules/commissions";
import { createAdministrator } from "@/modules/sales/application/create-administrator";
import { createAdministratorInstallmentRule } from "@/modules/sales/application/create-administrator-installment-rule";
import { createSale } from "@/modules/sales/application/create-sale";
import { sumInstallmentAmounts } from "@/modules/sales/application/installment-totals";
import { summarizeSellerSales } from "@/modules/sales/application/seller-summary";
import { administratorInstallmentRuleRepository } from "@/modules/sales/infrastructure/db/administrator-installment-rule-repository";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";
import { saleRepository } from "@/modules/sales/infrastructure/db/sale-repository";
import { sellerCommissionRepository } from "@/modules/sales/infrastructure/db/seller-commission-repository";
import { createSeller } from "@/modules/sellers/application/create-seller";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";

/**
 * O fluxo principal do MVP, de ponta a ponta e contra um PostgreSQL de verdade:
 * a administração cadastra administradora, régua e vendedor, cria o acesso
 * dele, registra a venda — e o vendedor entra com a própria senha e vê a
 * própria comissão.
 *
 * Cada passo usa o caso de uso real, e não o repositório direto, porque é a
 * composição entre os módulos que esta história protege. O banco é descartável
 * e recriado pelo `vitest.db.setup`.
 */

const SOLD_ON = "2026-03-10";
const FIRST_DUE_ON = "2026-04-10";
const CREDIT = "120.000,00";
const CREDIT_IN_CENTS = BigInt(12_000_000);
const SELLER_RATE_PERCENTAGE = "3";
const SELLER_RATE_BASIS_POINTS = 300;
// A administradora paga 6% à corretora em três parcelas; o vendedor leva 3%.
const RULE_RATES = [200, 200, 200];
// O mesmo crédito em sete parcelas não divide em centavos exatos, que é o caso
// em que o MVP manda ajustar a última.
const UNEVEN_RULE_RATES = [100, 100, 100, 100, 100, 100, 100];

const suffix = randomUUID().slice(0, 8);

/** CPF com os dois dígitos verificadores calculados, como o cadastro exige. */
function buildCpf(base: string): string {
  const digits = base.split("").map(Number);

  for (let position = 0; position < 2; position += 1) {
    const weightStart = digits.length + 1;
    const sum = digits.reduce(
      (total, digit, index) => total + digit * (weightStart - index),
      0,
    );
    const remainder = (sum * 10) % 11;

    digits.push(remainder === 10 ? 0 : remainder);
  }

  return digits.join("");
}

type Flow = {
  /** O vendedor como a sessão autenticada o devolve. É ele que vai às consultas. */
  sellerId: string;
  /** O identificador que o cadastro gerou, para confrontar com o da sessão. */
  registeredSellerId: string;
  sellerEmail: string;
  temporaryPassword: string;
  sessionToken: string;
  saleId: string;
  saleCode: string;
  unevenSaleCode: string;
  evenProduct: string;
  unevenProduct: string;
};

let flow: Flow;

describe("fluxo principal", () => {
  beforeAll(async () => {
    // 1. A administração cadastra a administradora e a régua de parcelas.
    const administrator = await createAdministrator(
      { name: `Administradora do fluxo ${suffix}` },
      { repository: administratorRepository },
    );

    const evenProduct = `Imóvel ${suffix}`;
    const unevenProduct = `Automóvel ${suffix}`;

    for (const [product, rates] of [
      [evenProduct, RULE_RATES],
      [unevenProduct, UNEVEN_RULE_RATES],
    ] as const) {
      await createAdministratorInstallmentRule(
        {
          administratorId: administrator.id,
          product,
          effectiveFrom: "2020-01-01",
          installmentRatesBasisPoints: rates,
        },
        { repository: administratorInstallmentRuleRepository },
      );
    }

    // 2. Cadastra o vendedor com o percentual acordado.
    const sellerEmail = `vendedor-${suffix}@exemplo.test`;
    const seller = await createSeller(
      {
        name: `Vendedor do fluxo ${suffix}`,
        document: buildCpf("123456789"),
        email: sellerEmail,
        phone: "11999990000",
        ratePercentage: SELLER_RATE_PERCENTAGE,
        effectiveFrom: "2020-01-01",
      },
      { repository: sellerRepository },
    );

    // 3. Cria o acesso do vendedor; a senha do primeiro acesso é sorteada.
    const access = await createSellerAccess(
      { sellerId: seller.id },
      { repository: sellerAccessRepository },
    );

    // 4. O vendedor entra com a própria senha.
    const session = await login(
      { email: sellerEmail, password: access.temporaryPassword },
      { repository: authRepository },
    );

    // 5. A sessão é quem diz de quem são as consultas daqui para a frente.
    const authenticated = await authenticateSession(session.sessionToken, {
      repository: authRepository,
    });

    if (authenticated?.role !== "seller" || !authenticated.sellerId) {
      throw new Error(
        "A sessão do vendedor não veio como vendedor com cadastro ligado",
      );
    }

    // 6. A administração registra as vendas.
    const sale = await createSale(
      {
        administratorId: administrator.id,
        sellerId: seller.id,
        customerName: `Cliente do fluxo ${suffix}`,
        product: evenProduct,
        groupCode: "0412",
        quotaCode: "031",
        soldOn: SOLD_ON,
        creditAmount: CREDIT,
        firstInstallmentDueOn: FIRST_DUE_ON,
      },
      { repository: saleRepository, today: SOLD_ON },
    );

    const unevenSale = await createSale(
      {
        administratorId: administrator.id,
        sellerId: seller.id,
        customerName: `Cliente do resto ${suffix}`,
        product: unevenProduct,
        groupCode: "0518",
        quotaCode: "007",
        soldOn: SOLD_ON,
        creditAmount: CREDIT,
        firstInstallmentDueOn: FIRST_DUE_ON,
      },
      { repository: saleRepository, today: SOLD_ON },
    );

    flow = {
      sellerId: authenticated.sellerId,
      registeredSellerId: seller.id,
      sellerEmail,
      temporaryPassword: access.temporaryPassword,
      sessionToken: session.sessionToken,
      saleId: sale.id,
      saleCode: sale.code,
      unevenSaleCode: unevenSale.code,
      evenProduct,
      unevenProduct,
    };
  }, 60_000);

  it("a sessão do vendedor traz o papel e o cadastro dele", async () => {
    const user = await authenticateSession(flow.sessionToken, {
      repository: authRepository,
    });

    expect(user?.role).toBe("seller");
    // O vendedor que a sessão devolve é o mesmo que o cadastro criou. Os casos
    // seguintes consultam pelo identificador vindo da sessão, então uma sessão
    // apontando para outro vendedor quebra este teste e os demais junto.
    expect(user?.sellerId).toBe(flow.registeredSellerId);
    expect(flow.sellerId).toBe(flow.registeredSellerId);
  });

  it("a venda gera as parcelas previstas pela régua da administradora", async () => {
    const sale = await sellerCommissionRepository.findSale(
      flow.saleId,
      flow.sellerId,
    );

    expect(sale?.installments).toHaveLength(RULE_RATES.length);
    expect(sale?.installments.map((installment) => installment.number)).toEqual(
      [1, 2, 3],
    );
    expect(
      sale?.installments.map((installment) => installment.competence),
    ).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(
      sale?.installments.every(
        (installment) => installment.status === "prevista",
      ),
    ).toBe(true);
  });

  it("a comissão é o crédito pelo percentual acordado, e as parcelas somam isso", async () => {
    const sale = await sellerCommissionRepository.findSale(
      flow.saleId,
      flow.sellerId,
    );
    const commissionInCents = calculateSellerCommissionTotal({
      creditAmountInCents: CREDIT_IN_CENTS,
      sellerRateBasisPoints: SELLER_RATE_BASIS_POINTS,
    });

    // 120.000,00 a 3% = 3.600,00, em três parcelas de 1.200,00.
    expect(commissionInCents).toBe(BigInt(360_000));
    expect(sale?.sellerRateBasisPoints).toBe(SELLER_RATE_BASIS_POINTS);
    expect(sumInstallmentAmounts(sale?.installments ?? [])).toBe(
      commissionInCents,
    );
  });

  it("quando a divisão não é exata, o ajuste cai na última parcela", async () => {
    const list = await sellerCommissionRepository.listSales(flow.sellerId, {
      search: flow.unevenSaleCode,
    });
    const installments = list[0]?.installments ?? [];
    const amounts = installments.map(
      (installment) => installment.amountInCents,
    );

    expect(installments).toHaveLength(UNEVEN_RULE_RATES.length);
    // Nenhum centavo se perde na distribuição...
    expect(sumInstallmentAmounts(installments)).toBe(BigInt(360_000));
    // ...e a sobra fica na última, não espalhada pelas outras.
    expect(new Set(amounts.slice(0, -1)).size).toBe(1);
    expect(amounts[amounts.length - 1]).toBeGreaterThan(amounts[0]);
  });

  it("o vendedor vê as próprias vendas pelos caminhos da área dele", async () => {
    const [list, installments, administratorOptions] = await Promise.all([
      sellerCommissionRepository.listSales(flow.sellerId),
      sellerCommissionRepository.listInstallments(flow.sellerId),
      sellerCommissionRepository.listSaleAdministrators(flow.sellerId),
    ]);

    expect(list.map((sale) => sale.code).sort()).toEqual(
      [flow.saleCode, flow.unevenSaleCode].sort(),
    );
    expect(installments).toHaveLength(
      RULE_RATES.length + UNEVEN_RULE_RATES.length,
    );
    expect(administratorOptions).toHaveLength(1);
  });

  it("o resumo do vendedor reproduz os mesmos números", async () => {
    const summary = summarizeSellerSales(
      await sellerCommissionRepository.listSales(flow.sellerId),
    );

    expect(summary.sales).toBe(2);
    expect(summary.creditInCents).toBe(CREDIT_IN_CENTS * BigInt(2));
    expect(summary.commissionInCents).toBe(BigInt(720_000));
    // As duas somas nascem iguais: é o que a tela promete ao vendedor.
    expect(summary.installmentsInCents).toBe(summary.commissionInCents);
    expect(summary.salesWithMismatch).toBe(0);
    expect(summary.salesWithoutInstallments).toBe(0);
  });
});
