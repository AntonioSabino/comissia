import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import {
  createInitialAdmin,
  InitialAdminAlreadyExistsError,
} from "../src/modules/auth/application/create-initial-admin";

config({ path: ".env.local", quiet: true });

/**
 * Popula o banco local com dados fictícios para demonstração. Todos os nomes,
 * documentos, e-mails e telefones são inventados: os CPFs são calculados a
 * partir de bases sequenciais e os e-mails usam o domínio reservado
 * `.test`, que nunca existe de verdade.
 *
 * O seed é repetível: cada registro é procurado pela sua chave natural antes
 * de ser inserido, então rodar duas vezes não duplica nada.
 */

const DEMO_ADMIN = {
  name: "Administração Comissia",
  email: "admin@exemplo.test",
};

/** Endereços aceitos sem confirmação explícita. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Senha sorteada a cada execução. Nenhuma credencial fica no repositório, e a
 * senha aparece uma única vez, no terminal de quem rodou o comando.
 */
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

type DemoSale = {
  administrator: string;
  seller: string;
  customerName: string;
  product: string;
  groupCode: string;
  quotaCode: string;
  soldOn: string;
  creditAmountInReais: number;
  commissionInstallments: number;
  firstInstallmentDueOn: string;
  quotaStatus: "adimplente" | "inadimplente" | "cancelado" | "contemplado";
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

const DEMO_SALES: DemoSale[] = [
  {
    administrator: "Consórcio Aurora",
    seller: "Helena Duarte",
    customerName: "Carla Meneses",
    product: "Imóvel",
    groupCode: "G1001",
    quotaCode: "Q001",
    soldOn: "2026-01-15",
    creditAmountInReais: 200_000,
    commissionInstallments: 12,
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
    creditAmountInReais: 90_000,
    commissionInstallments: 6,
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
    creditAmountInReais: 350_000,
    commissionInstallments: 24,
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
    creditAmountInReais: 45_000,
    commissionInstallments: 10,
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
    creditAmountInReais: 120_000,
    commissionInstallments: 18,
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
    creditAmountInReais: 280_000,
    commissionInstallments: 36,
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
    creditAmountInReais: 75_500,
    commissionInstallments: 8,
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
    creditAmountInReais: 410_000,
    commissionInstallments: 48,
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
    creditAmountInReais: 65_000,
    commissionInstallments: 12,
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
    creditAmountInReais: 32_750,
    commissionInstallments: 6,
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
    creditAmountInReais: 520_000,
    commissionInstallments: 60,
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
    creditAmountInReais: 98_900,
    commissionInstallments: 12,
    firstInstallmentDueOn: "2026-10-08",
    quotaStatus: "adimplente",
  },
];

/** Calcula os dois dígitos verificadores de um CPF a partir dos nove primeiros. */
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

function toCents(reais: number): bigint {
  return BigInt(Math.round(reais * 100));
}

/** Vigência aplicável na data da venda, como faz o cadastro de venda. */
function rateValidOn(seller: DemoSeller, date: string): DemoRate {
  const applicable = seller.rates
    .filter((rate) => rate.effectiveFrom <= date)
    .sort((first, second) =>
      first.effectiveFrom < second.effectiveFrom ? 1 : -1,
    );

  if (applicable.length === 0) {
    throw new Error(
      `O vendedor ${seller.name} não tem percentual vigente em ${date}`,
    );
  }

  return applicable[0];
}

async function run() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O seed de demonstração não deve rodar em produção");
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não foi definida em .env.local");
  }

  // `NODE_ENV` sozinho não protege um banco remoto mal configurado.
  const { hostname } = new URL(databaseUrl);

  if (!LOCAL_HOSTS.has(hostname) && !process.argv.includes("--allow-remote")) {
    throw new Error(
      `O seed é destinado ao banco local, e a DATABASE_URL aponta para ${hostname}. Se isso é intencional, repita com --allow-remote.`,
    );
  }

  const [
    { db, postgresPool },
    { and, eq, sql },
    { administrators, sales },
    { sellerCommissionRates, sellers },
    { PostgresInitialAdminRepository },
  ] = await Promise.all([
    import("../src/db/index"),
    import("drizzle-orm"),
    import("../src/modules/sales/index"),
    import("../src/modules/sellers/index"),
    import("../src/modules/auth/infrastructure/db/initial-admin-repository"),
  ]);

  console.log(`Banco: ${new URL(databaseUrl).pathname.slice(1)}`);

  try {
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
    let createdAdministrators = 0;

    for (const administrator of DEMO_ADMINISTRATORS) {
      const [existing] = await db
        .select({ id: administrators.id })
        .from(administrators)
        .where(
          sql`lower(${administrators.name}) = lower(${administrator.name})`,
        )
        .limit(1);

      if (existing) {
        administratorIds.set(administrator.name, existing.id);
        continue;
      }

      const [created] = await db
        .insert(administrators)
        .values({ name: administrator.name, active: administrator.active })
        .returning({ id: administrators.id });

      administratorIds.set(administrator.name, created.id);
      createdAdministrators += 1;
    }

    console.log(
      `Administradoras: ${createdAdministrators} criadas, ${DEMO_ADMINISTRATORS.length - createdAdministrators} já existiam.`,
    );

    const sellerIds = new Map<string, string>();
    const storedRates = new Map<
      string,
      { id: string; rateBasisPoints: number }
    >();
    let createdSellers = 0;
    let createdRates = 0;

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

        // O percentual gravado é o da linha que existe, não o do script: o
        // snapshot da venda precisa bater com a vigência referenciada.
        if (existingRate) {
          storedRates.set(`${seller.name}:${rate.effectiveFrom}`, existingRate);

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

        storedRates.set(`${seller.name}:${rate.effectiveFrom}`, createdRate);
        createdRates += 1;
      }
    }

    console.log(
      `Vendedores: ${createdSellers} criados, ${DEMO_SELLERS.length - createdSellers} já existiam.`,
    );
    console.log(`Vigências de percentual: ${createdRates} criadas.`);

    let createdSales = 0;

    for (const sale of DEMO_SALES) {
      const administratorId = administratorIds.get(sale.administrator);
      const sellerId = sellerIds.get(sale.seller);
      const seller = DEMO_SELLERS.find((item) => item.name === sale.seller);

      if (!administratorId || !sellerId || !seller) {
        throw new Error(
          `Venda ${sale.groupCode}/${sale.quotaCode} inconsistente`,
        );
      }

      const [existing] = await db
        .select({ id: sales.id })
        .from(sales)
        .where(
          and(
            eq(sales.administratorId, administratorId),
            eq(sales.groupCode, sale.groupCode),
            eq(sales.quotaCode, sale.quotaCode),
          ),
        )
        .limit(1);

      if (existing) {
        continue;
      }

      const rate = rateValidOn(seller, sale.soldOn);
      const storedRate = storedRates.get(
        `${seller.name}:${rate.effectiveFrom}`,
      );

      if (!storedRate) {
        throw new Error(
          `Vigência de ${seller.name} em ${rate.effectiveFrom} não foi encontrada`,
        );
      }

      await db.insert(sales).values({
        administratorId,
        sellerId,
        sellerCommissionRateId: storedRate.id,
        sellerRateBasisPoints: storedRate.rateBasisPoints,
        customerName: sale.customerName,
        product: sale.product,
        groupCode: sale.groupCode,
        quotaCode: sale.quotaCode,
        soldOn: sale.soldOn,
        creditAmountInCents: toCents(sale.creditAmountInReais),
        commissionInstallments: sale.commissionInstallments,
        firstInstallmentDueOn: sale.firstInstallmentDueOn,
        quotaStatus: sale.quotaStatus,
      });

      createdSales += 1;
    }

    console.log(
      `Vendas: ${createdSales} criadas, ${DEMO_SALES.length - createdSales} já existiam.`,
    );
    console.log("Seed concluído.");
  } finally {
    await postgresPool.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  console.error(`Falha ao popular os dados de demonstração: ${message}`);
  process.exitCode = 1;
});
