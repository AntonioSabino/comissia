import type { AdminCommissionInstallment } from "./admin-commission-repository";
import { buildPayoutClosing, type PayoutClosing } from "./payout-closing";
import type { SaleListItem } from "./sale-repository";

/** Quantos vendedores o ranking mostra. */
const RANKING_SIZE = 5;

export type SellerProduction = {
  sellerId: string;
  sellerName: string;
  sales: number;
  creditInCents: bigint;
};

export type AdministratorProduction = {
  administratorId: string;
  administratorName: string;
  sales: number;
  creditInCents: bigint;
  /** Participação no crédito do mês, em pontos-base (10.000 = 100%). */
  shareBasisPoints: number;
};

export type AdminOverview = {
  sales: number;
  creditInCents: bigint;
  /**
   * Parcelas da competência em qualquer situação, inclusive as canceladas e
   * ajustadas que ficam fora do fechamento mas continuam em Repasses.
   */
  installments: number;
  /** Os vendedores que mais venderam no mês, pelo crédito. */
  ranking: SellerProduction[];
  /** Vendedores com venda no mês, além dos que aparecem no ranking. */
  otherSellers: number;
  administrators: AdministratorProduction[];
  /** O fechamento da competência, com a mesma soma da tela de repasses. */
  closing: PayoutClosing;
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Regra gregoriana, sem `Date`: `Date.UTC` trata os anos 0–99 como 1900–1999. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Período de datas de venda de uma competência (AAAA-MM), do primeiro ao
 * último dia, para recortar a lista de vendas. O último dia sai da aritmética
 * do calendário, sem fuso horário nem `Date`.
 */
export function soldPeriodOf(competence: string): {
  soldFrom: string;
  soldTo: string;
} {
  const [year, month] = competence.split("-").map(Number);
  const lastDay =
    month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];

  return {
    soldFrom: `${competence}-01`,
    soldTo: `${competence}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Maior crédito primeiro; no empate, ordem alfabética. */
function byCreditThenName<Item extends { creditInCents: bigint }>(
  nameOf: (item: Item) => string,
): (first: Item, second: Item) => number {
  return (first, second) => {
    if (first.creditInCents !== second.creditInCents) {
      return first.creditInCents > second.creditInCents ? -1 : 1;
    }

    return nameOf(first).localeCompare(nameOf(second), "pt-BR");
  };
}

/**
 * Números da Visão geral de um mês: a produção (vendas feitas no mês) e o
 * fechamento das comissões da mesma competência. Tudo em centavos inteiros; a
 * participação de cada administradora é arredondada para baixo em pontos-base.
 */
export function buildAdminOverview(
  sales: readonly SaleListItem[],
  installments: readonly AdminCommissionInstallment[],
): AdminOverview {
  const creditInCents = sales.reduce(
    (total, sale) => total + sale.creditAmountInCents,
    BigInt(0),
  );
  const sellers = new Map<string, SellerProduction>();
  const administrators = new Map<
    string,
    Omit<AdministratorProduction, "shareBasisPoints">
  >();

  for (const sale of sales) {
    const seller = sellers.get(sale.sellerId) ?? {
      sellerId: sale.sellerId,
      sellerName: sale.sellerName,
      sales: 0,
      creditInCents: BigInt(0),
    };
    seller.sales += 1;
    seller.creditInCents += sale.creditAmountInCents;
    sellers.set(sale.sellerId, seller);

    const administrator = administrators.get(sale.administratorId) ?? {
      administratorId: sale.administratorId,
      administratorName: sale.administratorName,
      sales: 0,
      creditInCents: BigInt(0),
    };
    administrator.sales += 1;
    administrator.creditInCents += sale.creditAmountInCents;
    administrators.set(sale.administratorId, administrator);
  }

  const ranked = [...sellers.values()].sort(
    byCreditThenName((seller) => seller.sellerName),
  );

  return {
    sales: sales.length,
    creditInCents,
    installments: installments.length,
    ranking: ranked.slice(0, RANKING_SIZE),
    otherSellers: Math.max(ranked.length - RANKING_SIZE, 0),
    administrators: [...administrators.values()]
      .sort(byCreditThenName((item) => item.administratorName))
      .map((administrator) => ({
        ...administrator,
        shareBasisPoints:
          creditInCents > BigInt(0)
            ? Number(
                (administrator.creditInCents * BigInt(10_000)) / creditInCents,
              )
            : 0,
      })),
    closing: buildPayoutClosing(installments),
  };
}
