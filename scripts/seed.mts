import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import {
  createInitialAdmin,
  InitialAdminAlreadyExistsError,
} from "../src/modules/auth/application/create-initial-admin";
import {
  findExistingDemoSale,
  findInstallmentIdsMissingInitialStatus,
  validateSeedTarget,
} from "./seed-support";

config({ path: ".env.local", quiet: true });

/**
 * Popula o banco local com um cenário fictício de demonstração. Os dados não
 * representam clientes, vendedores ou administradoras reais e podem ser
 * ajustados enquanto a SCRUM-62 estiver em validação.
 */

const DEMO_ADMIN = {
  name: "Administração Comissia",
  email: "admin@exemplo.test",
};

const SEED_LOCK_ID = 62_000_001;

function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

type DemoAdministrator = {
  name: string;
  active: boolean;
};

type DemoRate = {
  rateBasisPoints: number;
  effectiveFrom: string;
};

type DemoSeller = {
  name: string;
  cpfBase: string;
  email: string;
  phone: string;
  active: boolean;
  rates: DemoRate[];
};

type DemoInstallmentRule = {
  administrator: string;
  product: string;
  effectiveFrom: string;
  installmentRatesBasisPoints: number[];
};

type DemoSale = {
  administrator: string;
  seller: string;
  customerName: string;
  product: string;
  groupCode: string;
  quotaCode: string;
  soldOn: string;
  creditAmountInCents: bigint;
  firstInstallmentDueOn: string;
  quotaStatus: "adimplente" | "inadimplente" | "cancelado" | "contemplado";
};

type StoredRate = {
  id: string;
  rateBasisPoints: number;
};

type StoredInstallmentRule = {
  id: string;
  installmentRatesBasisPoints: number[];
};

const DEMO_ADMINISTRATORS: DemoAdministrator[] = [
  { name: "Consórcio Aurora", active: true },
  { name: "Vega Administradora", active: true },
  { name: "Meridiano Consórcios", active: false },
];

const DEMO_SELLERS: DemoSeller[] = [
  {
    name: "Helena Duarte",
    cpfBase: "100200300",
    email: "helena.duarte@exemplo.test",
    phone: "(11) 90000-0001",
    active: true,
    rates: [
      { rateBasisPoints: 150, effectiveFrom: "2026-01-01" },
      { rateBasisPoints: 180, effectiveFrom: "2026-07-01" },
    ],
  },
  {
    name: "Rafael Bittencourt",
    cpfBase: "100200301",
    email: "rafael.bittencourt@exemplo.test",
    phone: "(11) 90000-0002",
    active: true,
    rates: [{ rateBasisPoints: 200, effectiveFrom: "2026-01-01" }],
  },
  {
    name: "Marina Teixeira",
    cpfBase: "100200302",
    email: "marina.teixeira@exemplo.test",
    phone: "(21) 90000-0003",
    active: true,
    rates: [{ rateBasisPoints: 250, effectiveFrom: "2026-03-01" }],
  },
  {
    name: "Otávio Rangel",
    cpfBase: "100200303",
    email: "otavio.rangel@exemplo.test",
    phone: "(31) 90000-0004",
    active: false,
    rates: [{ rateBasisPoints: 120, effectiveFrom: "2026-01-01" }],
  },
];

/**
 * A distribuição representa o que a administradora paga à corretora. O
 * percentual do vendedor sai de dentro desse total e é repartido na mesma
 * proporção. A segunda vigência de Automóvel/Aurora exercita o snapshot: vendas
 * anteriores e posteriores a julho ficam ligadas a versões diferentes.
 */
const DEMO_INSTALLMENT_RULES: DemoInstallmentRule[] = [
  {
    administrator: "Consórcio Aurora",
    product: "Imóvel",
    effectiveFrom: "2026-01-01",
    installmentRatesBasisPoints: [75, 75, 50, 50, 50, 50, 25, 25],
  },
  {
    administrator: "Consórcio Aurora",
    product: "Automóvel",
    effectiveFrom: "2026-01-01",
    installmentRatesBasisPoints: [100, 100, 75, 50, 25],
  },
  {
    administrator: "Consórcio Aurora",
    product: "Automóvel",
    effectiveFrom: "2026-07-01",
    installmentRatesBasisPoints: [75, 75, 75, 50, 50, 25],
  },
  {
    administrator: "Vega Administradora",
    product: "Imóvel",
    effectiveFrom: "2026-01-01",
    installmentRatesBasisPoints: [100, 75, 75, 50, 50],
  },
  {
    administrator: "Vega Administradora",
    product: "Automóvel",
    effectiveFrom: "2026-01-01",
    installmentRatesBasisPoints: [100, 100, 75, 50, 25],
  },
  {
    administrator: "Vega Administradora",
    product: "Serviços",
    effectiveFrom: "2026-01-01",
    installmentRatesBasisPoints: [125, 100, 75],
  },
  {
    administrator: "Meridiano Consórcios",
    product: "Imóvel",
    effectiveFrom: "2026-01-01",
    installmentRatesBasisPoints: [60, 60, 60, 60, 60],
  },
];

const DEMO_SALES: DemoSale[] = [
  {
    administrator: "Consórcio Aurora",
    seller: "Helena Duarte",
    customerName: "Carla Meneses",
    product: "Imóvel",
    groupCode: "G1001",
    quotaCode: "Q001",
    soldOn: "2026-01-15",
    creditAmountInCents: 20_000_000n,
    firstInstallmentDueOn: "2026-02-15",
    quotaStatus: "adimplente",
  },
  {
    administrator: "Consórcio Aurora",
    seller: "Rafael Bittencourt",
    customerName: "Diego Prado",
    product: "Automóvel",
    groupCode: "G1001",
    quotaCode: "Q002",
    soldOn: "2026-01-31",
    creditAmountInCents: 9_000_000n,
    firstInstallmentDueOn: "2026-02-28",
    quotaStatus: "contemplado",
  },
  {
    administrator: "Vega Administradora",
    seller: "Helena Duarte",
    customerName: "Eva Nogueira",
    product: "Imóvel",
    groupCode: "G2050",
    quotaCode: "Q014",
    soldOn: "2026-02-10",
    creditAmountInCents: 35_000_000n,
    firstInstallmentDueOn: "2026-03-10",
    quotaStatus: "adimplente",
  },
  {
    administrator: "Vega Administradora",
    seller: "Marina Teixeira",
    customerName: "Fábio Correia",
    product: "Serviços",
    groupCode: "G2050",
    quotaCode: "Q015",
    soldOn: "2026-03-05",
    creditAmountInCents: 4_500_000n,
    firstInstallmentDueOn: "2026-04-05",
    quotaStatus: "inadimplente",
  },
  {
    administrator: "Consórcio Aurora",
    seller: "Marina Teixeira",
    customerName: "Gabriela Antunes",
    product: "Automóvel",
    groupCode: "G1002",
    quotaCode: "Q003",
    soldOn: "2026-03-27",
    creditAmountInCents: 12_000_000n,
    firstInstallmentDueOn: "2026-04-27",
    quotaStatus: "adimplente",
  },
  {
    administrator: "Meridiano Consórcios",
    seller: "Otávio Rangel",
    customerName: "Henrique Salles",
    product: "Imóvel",
    groupCode: "G3010",
    quotaCode: "Q007",
    soldOn: "2026-04-02",
    creditAmountInCents: 28_000_000n,
    firstInstallmentDueOn: "2026-05-02",
    quotaStatus: "cancelado",
  },
  {
    administrator: "Vega Administradora",
    seller: "Rafael Bittencourt",
    customerName: "Isabel Fontes",
    product: "Automóvel",
    groupCode: "G2051",
    quotaCode: "Q021",
    soldOn: "2026-05-18",
    creditAmountInCents: 7_550_000n,
    firstInstallmentDueOn: "2026-06-18",
    quotaStatus: "adimplente",
  },
  {
    administrator: "Consórcio Aurora",
    seller: "Helena Duarte",
    customerName: "João Vilela",
    product: "Imóvel",
    groupCode: "G1002",
    quotaCode: "Q004",
    soldOn: "2026-06-30",
    creditAmountInCents: 41_000_000n,
    firstInstallmentDueOn: "2026-07-30",
    quotaStatus: "adimplente",
  },
  {
    administrator: "Consórcio Aurora",
    seller: "Helena Duarte",
    customerName: "Kelly Moraes",
    product: "Automóvel",
    groupCode: "G1003",
    quotaCode: "Q005",
    soldOn: "2026-07-14",
    creditAmountInCents: 6_500_000n,
    firstInstallmentDueOn: "2026-08-14",
    quotaStatus: "adimplente",
  },
  {
    administrator: "Vega Administradora",
    seller: "Marina Teixeira",
    customerName: "Lucas Amorim",
    product: "Serviços",
    groupCode: "G2052",
    quotaCode: "Q030",
    soldOn: "2026-08-03",
    creditAmountInCents: 3_275_000n,
    firstInstallmentDueOn: "2026-09-03",
    quotaStatus: "inadimplente",
  },
  {
    administrator: "Vega Administradora",
    seller: "Rafael Bittencourt",
    customerName: "Mariana Rocha",
    product: "Imóvel",
    groupCode: "G2052",
    quotaCode: "Q031",
    soldOn: "2026-08-21",
    creditAmountInCents: 52_000_000n,
    firstInstallmentDueOn: "2026-09-21",
    quotaStatus: "contemplado",
  },
  {
    administrator: "Consórcio Aurora",
    seller: "Helena Duarte",
    customerName: "Nelson Bastos",
    product: "Automóvel",
    groupCode: "G1003",
    quotaCode: "Q006",
    soldOn: "2026-09-08",
    creditAmountInCents: 9_890_000n,
    firstInstallmentDueOn: "2026-10-08",
    quotaStatus: "adimplente",
  },
];

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

function normalizedProduct(product: string): string {
  return product.toLocaleLowerCase("pt-BR");
}

function rateKey(seller: string, effectiveFrom: string): string {
  return `${seller}:${effectiveFrom}`;
}

function ruleKey(
  administrator: string,
  product: string,
  effectiveFrom: string,
): string {
  return `${administrator}:${normalizedProduct(product)}:${effectiveFrom}`;
}

function rateValidOn(seller: DemoSeller, date: string): DemoRate {
  const rate = seller.rates
    .filter((item) => item.effectiveFrom <= date)
    .sort((first, second) =>
      first.effectiveFrom < second.effectiveFrom ? 1 : -1,
    )[0];

  if (!rate) {
    throw new Error(
      `O vendedor ${seller.name} não tem percentual vigente em ${date}`,
    );
  }

  return rate;
}

function ruleValidOn(
  administrator: string,
  product: string,
  date: string,
): DemoInstallmentRule {
  const rule = DEMO_INSTALLMENT_RULES.filter(
    (item) =>
      item.administrator === administrator &&
      normalizedProduct(item.product) === normalizedProduct(product) &&
      item.effectiveFrom <= date,
  ).sort((first, second) =>
    first.effectiveFrom < second.effectiveFrom ? 1 : -1,
  )[0];

  if (!rule) {
    throw new Error(
      `A administradora ${administrator} não tem régua de ${product} vigente em ${date}`,
    );
  }

  return rule;
}

function sameNumbers(
  first: readonly number[] | null,
  second: readonly number[],
): boolean {
  return (
    first !== null &&
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  const parsedDatabaseUrl = validateSeedTarget(
    process.env.NODE_ENV,
    databaseUrl,
    process.argv.includes("--allow-remote"),
    process.env.DEPLOYMENT_ENV,
  );

  const [
    { db, postgresPool },
    { and, eq, sql },
    {
      administratorInstallmentRules,
      administrators,
      commissionInstallments,
      commissionInstallmentStatusEvents,
      sales,
    },
    { sellerCommissionRates, sellers },
    { generateSellerCommissionInstallments },
    { PostgresInitialAdminRepository },
  ] = await Promise.all([
    import("../src/db/index"),
    import("drizzle-orm"),
    import("../src/modules/sales/index"),
    import("../src/modules/sellers/index"),
    import("../src/modules/commissions/index"),
    import("../src/modules/auth/infrastructure/db/initial-admin-repository"),
  ]);

  console.log(`Banco: ${parsedDatabaseUrl.pathname.slice(1)}`);

  const lockClient = await postgresPool.connect();
  let hasSeedLock = false;

  try {
    const { rows } = await lockClient.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [SEED_LOCK_ID],
    );
    hasSeedLock = rows[0]?.acquired ?? false;

    if (!hasSeedLock) {
      throw new Error("Outro seed de demonstração já está em execução");
    }

    try {
      const password = generatePassword();
      const admin = await createInitialAdmin(
        { ...DEMO_ADMIN, password },
        { repository: new PostgresInitialAdminRepository() },
      );

      console.log(`Administrador criado: ${admin.email}`);
      console.log(`Senha sorteada agora, anote: ${password}`);
    } catch (error) {
      if (!(error instanceof InitialAdminAlreadyExistsError)) {
        throw error;
      }

      console.log("Administrador: já existe, mantido como está.");
    }

    const administratorIds = new Map<string, string>();
    const sellerIds = new Map<string, string>();
    const storedRates = new Map<string, StoredRate>();
    const storedRules = new Map<string, StoredInstallmentRule>();
    let createdAdministrators = 0;
    let createdSellers = 0;
    let createdRates = 0;
    let createdRules = 0;
    let createdSales = 0;
    let backfilledSales = 0;
    let createdInstallments = 0;

    try {
      for (const administrator of DEMO_ADMINISTRATORS) {
        const [existing] = await db
          .select({ id: administrators.id })
          .from(administrators)
          .where(
            sql`lower(${administrators.name}) = lower(${administrator.name})`,
          )
          .limit(1);

        let administratorId: string;

        if (existing) {
          administratorId = existing.id;
        } else {
          const [created] = await db
            .insert(administrators)
            .values({ name: administrator.name, active: administrator.active })
            .returning({ id: administrators.id });

          administratorId = created.id;
          createdAdministrators += 1;
        }

        administratorIds.set(administrator.name, administratorId);
        await db
          .update(administrators)
          .set({ active: administrator.active, updatedAt: new Date() })
          .where(eq(administrators.id, administratorId));
      }

      for (const seller of DEMO_SELLERS) {
        const document = buildCpf(seller.cpfBase);
        const [existing] = await db
          .select({ id: sellers.id })
          .from(sellers)
          .where(eq(sellers.document, document))
          .limit(1);

        let sellerId: string;

        if (existing) {
          sellerId = existing.id;
        } else {
          const [created] = await db
            .insert(sellers)
            .values({
              name: seller.name,
              document,
              email: seller.email,
              phone: seller.phone,
              active: seller.active,
            })
            .returning({ id: sellers.id });

          sellerId = created.id;
          createdSellers += 1;
        }

        sellerIds.set(seller.name, sellerId);
        await db
          .update(sellers)
          .set({ active: seller.active, updatedAt: new Date() })
          .where(eq(sellers.id, sellerId));

        for (const rate of seller.rates) {
          const [existingRate] = await db
            .select({
              id: sellerCommissionRates.id,
              rateBasisPoints: sellerCommissionRates.rateBasisPoints,
            })
            .from(sellerCommissionRates)
            .where(
              and(
                eq(sellerCommissionRates.sellerId, sellerId),
                eq(sellerCommissionRates.effectiveFrom, rate.effectiveFrom),
              ),
            )
            .limit(1);

          if (existingRate) {
            storedRates.set(
              rateKey(seller.name, rate.effectiveFrom),
              existingRate,
            );

            if (existingRate.rateBasisPoints !== rate.rateBasisPoints) {
              console.log(
                `Vigência de ${seller.name} em ${rate.effectiveFrom}: mantido o percentual já gravado (${existingRate.rateBasisPoints} pontos-base).`,
              );
            }

            continue;
          }

          const [createdRate] = await db
            .insert(sellerCommissionRates)
            .values({
              sellerId,
              rateBasisPoints: rate.rateBasisPoints,
              effectiveFrom: rate.effectiveFrom,
            })
            .returning({
              id: sellerCommissionRates.id,
              rateBasisPoints: sellerCommissionRates.rateBasisPoints,
            });

          storedRates.set(
            rateKey(seller.name, rate.effectiveFrom),
            createdRate,
          );
          createdRates += 1;
        }
      }

      for (const rule of DEMO_INSTALLMENT_RULES) {
        const administratorId = administratorIds.get(rule.administrator);

        if (!administratorId) {
          throw new Error(
            `Administradora da régua não encontrada: ${rule.administrator}`,
          );
        }

        const [existingRule] = await db
          .select({
            id: administratorInstallmentRules.id,
            installmentRatesBasisPoints:
              administratorInstallmentRules.installmentRatesBasisPoints,
          })
          .from(administratorInstallmentRules)
          .where(
            and(
              eq(
                administratorInstallmentRules.administratorId,
                administratorId,
              ),
              sql`lower(${administratorInstallmentRules.product}) = lower(${rule.product})`,
              eq(
                administratorInstallmentRules.effectiveFrom,
                rule.effectiveFrom,
              ),
            ),
          )
          .limit(1);

        const key = ruleKey(
          rule.administrator,
          rule.product,
          rule.effectiveFrom,
        );

        if (existingRule) {
          storedRules.set(key, existingRule);

          if (
            !sameNumbers(
              existingRule.installmentRatesBasisPoints,
              rule.installmentRatesBasisPoints,
            )
          ) {
            console.log(
              `Régua de ${rule.administrator}/${rule.product} em ${rule.effectiveFrom}: mantida a distribuição já gravada.`,
            );
          }

          continue;
        }

        const [createdRule] = await db
          .insert(administratorInstallmentRules)
          .values({
            administratorId,
            product: rule.product,
            effectiveFrom: rule.effectiveFrom,
            installmentRatesBasisPoints: [...rule.installmentRatesBasisPoints],
          })
          .returning({
            id: administratorInstallmentRules.id,
            installmentRatesBasisPoints:
              administratorInstallmentRules.installmentRatesBasisPoints,
          });

        storedRules.set(key, createdRule);
        createdRules += 1;
      }

      const persistInstallments = async (
        transaction: Pick<typeof db, "insert">,
        saleId: string,
        installments: ReturnType<typeof generateSellerCommissionInstallments>,
      ) => {
        const persistedInstallments = await transaction
          .insert(commissionInstallments)
          .values(
            installments.map((installment) => ({
              saleId,
              number: installment.number,
              competence: installment.competence,
              dueOn: installment.dueOn,
              ruleRateBasisPoints: installment.rateBasisPoints,
              amountInCents: installment.amountInCents,
            })),
          )
          .returning({
            id: commissionInstallments.id,
            number: commissionInstallments.number,
          });

        const installmentIdByNumber = new Map(
          persistedInstallments.map(({ id, number }) => [number, id]),
        );

        await transaction.insert(commissionInstallmentStatusEvents).values(
          installments.flatMap((installment) =>
            installment.statusHistory.map((entry, index) => {
              const installmentId = installmentIdByNumber.get(
                installment.number,
              );

              if (!installmentId) {
                throw new Error(
                  `Parcela ${installment.number} da venda ${saleId} não foi persistida`,
                );
              }

              return {
                installmentId,
                sequence: index + 1,
                previousStatus: entry.previousStatus,
                status: entry.status,
                changedAt: new Date(entry.changedAt),
              };
            }),
          ),
        );
      };

      for (const sale of DEMO_SALES) {
        const administratorId = administratorIds.get(sale.administrator);
        const sellerId = sellerIds.get(sale.seller);
        const seller = DEMO_SELLERS.find((item) => item.name === sale.seller);

        if (!administratorId || !sellerId || !seller) {
          throw new Error(
            `Venda ${sale.groupCode}/${sale.quotaCode} inconsistente`,
          );
        }

        const configuredRate = rateValidOn(seller, sale.soldOn);
        const storedRate = storedRates.get(
          rateKey(seller.name, configuredRate.effectiveFrom),
        );
        const configuredRule = ruleValidOn(
          sale.administrator,
          sale.product,
          sale.soldOn,
        );
        const storedRule = storedRules.get(
          ruleKey(
            configuredRule.administrator,
            configuredRule.product,
            configuredRule.effectiveFrom,
          ),
        );

        if (!storedRate || !storedRule) {
          throw new Error(
            `Percentual ou régua da venda ${sale.groupCode}/${sale.quotaCode} não foi encontrado`,
          );
        }

        const ruleTotalBasisPoints =
          storedRule.installmentRatesBasisPoints.reduce(
            (total, rate) => total + rate,
            0,
          );

        if (storedRate.rateBasisPoints > ruleTotalBasisPoints) {
          throw new Error(
            `O percentual de ${sale.seller} excede a régua de ${sale.administrator}/${sale.product}`,
          );
        }

        const generatedInstallments = generateSellerCommissionInstallments({
          creditAmountInCents: sale.creditAmountInCents,
          sellerRateBasisPoints: storedRate.rateBasisPoints,
          installmentRatesBasisPoints: storedRule.installmentRatesBasisPoints,
          firstInstallmentDueOn: sale.firstInstallmentDueOn,
          createdAt: new Date(),
        });

        const existingCandidates = await db
          .select({
            id: sales.id,
            sellerId: sales.sellerId,
            sellerCommissionRateId: sales.sellerCommissionRateId,
            sellerRateBasisPoints: sales.sellerRateBasisPoints,
            customerName: sales.customerName,
            product: sales.product,
            soldOn: sales.soldOn,
            creditAmountInCents: sales.creditAmountInCents,
            firstInstallmentDueOn: sales.firstInstallmentDueOn,
            administratorInstallmentRuleId:
              sales.administratorInstallmentRuleId,
            installmentRatesBasisPoints: sales.installmentRatesBasisPoints,
            commissionInstallments: sales.commissionInstallments,
          })
          .from(sales)
          .where(
            and(
              eq(sales.administratorId, administratorId),
              eq(sales.groupCode, sale.groupCode),
              eq(sales.quotaCode, sale.quotaCode),
            ),
          );

        const existing = findExistingDemoSale(
          existingCandidates,
          {
            sellerId,
            sellerCommissionRateId: storedRate.id,
            sellerRateBasisPoints: storedRate.rateBasisPoints,
            customerName: sale.customerName,
            product: sale.product,
            soldOn: sale.soldOn,
            creditAmountInCents: sale.creditAmountInCents,
            firstInstallmentDueOn: sale.firstInstallmentDueOn,
          },
          `${sale.groupCode}/${sale.quotaCode}`,
        );

        if (!existing) {
          await db.transaction(async (transaction) => {
            const [created] = await transaction
              .insert(sales)
              .values({
                administratorId,
                administratorInstallmentRuleId: storedRule.id,
                sellerId,
                sellerCommissionRateId: storedRate.id,
                sellerRateBasisPoints: storedRate.rateBasisPoints,
                installmentRatesBasisPoints: [
                  ...storedRule.installmentRatesBasisPoints,
                ],
                customerName: sale.customerName,
                product: sale.product,
                groupCode: sale.groupCode,
                quotaCode: sale.quotaCode,
                soldOn: sale.soldOn,
                creditAmountInCents: sale.creditAmountInCents,
                commissionInstallments: generatedInstallments.length,
                firstInstallmentDueOn: sale.firstInstallmentDueOn,
                quotaStatus: sale.quotaStatus,
              })
              .returning({ id: sales.id });

            await persistInstallments(
              transaction,
              created.id,
              generatedInstallments,
            );
          });

          createdSales += 1;
          createdInstallments += generatedInstallments.length;
          continue;
        }

        const persistedInstallments = await db
          .select({ id: commissionInstallments.id })
          .from(commissionInstallments)
          .where(eq(commissionInstallments.saleId, existing.id));

        if (
          existing.administratorInstallmentRuleId === null &&
          existing.installmentRatesBasisPoints === null &&
          persistedInstallments.length === 0
        ) {
          await db.transaction(async (transaction) => {
            await transaction
              .update(sales)
              .set({
                administratorInstallmentRuleId: storedRule.id,
                sellerCommissionRateId: storedRate.id,
                sellerRateBasisPoints: storedRate.rateBasisPoints,
                installmentRatesBasisPoints: [
                  ...storedRule.installmentRatesBasisPoints,
                ],
                commissionInstallments: generatedInstallments.length,
                quotaStatus: sale.quotaStatus,
                updatedAt: new Date(),
              })
              .where(eq(sales.id, existing.id));

            await persistInstallments(
              transaction,
              existing.id,
              generatedInstallments,
            );
          });

          backfilledSales += 1;
          createdInstallments += generatedInstallments.length;
          continue;
        }

        if (
          existing.administratorInstallmentRuleId === null ||
          existing.installmentRatesBasisPoints === null ||
          persistedInstallments.length !== existing.commissionInstallments
        ) {
          throw new Error(
            `A venda fictícia ${sale.groupCode}/${sale.quotaCode} está parcialmente preenchida; recrie o banco local antes de repetir o seed`,
          );
        }

        const persistedEvents = await db
          .select({
            installmentId: commissionInstallmentStatusEvents.installmentId,
            sequence: commissionInstallmentStatusEvents.sequence,
            previousStatus: commissionInstallmentStatusEvents.previousStatus,
            status: commissionInstallmentStatusEvents.status,
          })
          .from(commissionInstallmentStatusEvents)
          .innerJoin(
            commissionInstallments,
            eq(
              commissionInstallmentStatusEvents.installmentId,
              commissionInstallments.id,
            ),
          )
          .where(eq(commissionInstallments.saleId, existing.id));

        const installmentsWithoutInitialStatus =
          findInstallmentIdsMissingInitialStatus(
            persistedInstallments.map(({ id }) => id),
            persistedEvents,
          );

        if (installmentsWithoutInitialStatus.length > 0) {
          throw new Error(
            `A venda fictícia ${sale.groupCode}/${sale.quotaCode} tem parcela sem situação inicial`,
          );
        }

        await db
          .update(sales)
          .set({ quotaStatus: sale.quotaStatus, updatedAt: new Date() })
          .where(eq(sales.id, existing.id));
      }

      console.log(
        `Administradoras: ${createdAdministrators} criadas, ${DEMO_ADMINISTRATORS.length - createdAdministrators} já existiam.`,
      );
      console.log(
        `Vendedores: ${createdSellers} criados, ${DEMO_SELLERS.length - createdSellers} já existiam.`,
      );
      console.log(`Vigências de vendedor: ${createdRates} criadas.`);
      console.log(`Réguas de parcelas: ${createdRules} criadas.`);
      console.log(
        `Vendas: ${createdSales} criadas, ${backfilledSales} complementadas, ${DEMO_SALES.length - createdSales - backfilledSales} já existiam.`,
      );
      console.log(`Parcelas previstas: ${createdInstallments} criadas.`);
      console.log("Seed concluído.");
    } finally {
      for (const administrator of DEMO_ADMINISTRATORS) {
        const administratorId = administratorIds.get(administrator.name);

        if (administratorId) {
          await db
            .update(administrators)
            .set({ active: administrator.active, updatedAt: new Date() })
            .where(eq(administrators.id, administratorId));
        }
      }

      for (const seller of DEMO_SELLERS) {
        const sellerId = sellerIds.get(seller.name);

        if (sellerId) {
          await db
            .update(sellers)
            .set({ active: seller.active, updatedAt: new Date() })
            .where(eq(sellers.id, sellerId));
        }
      }
    }
  } finally {
    if (hasSeedLock) {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [SEED_LOCK_ID]);
    }

    lockClient.release();
    await postgresPool.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  console.error(`Falha ao popular os dados de demonstração: ${message}`);
  process.exitCode = 1;
});
