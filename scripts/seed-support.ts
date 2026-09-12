const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type SeedSaleIdentity = {
  sellerId: string;
  sellerCommissionRateId: string;
  sellerRateBasisPoints: number;
  customerName: string;
  product: string;
  soldOn: string;
  creditAmountInCents: bigint;
  firstInstallmentDueOn: string;
};

export type SeedInstallmentStatusEvent = {
  installmentId: string;
  sequence: number;
  previousStatus: string | null;
  status: string;
};

export function validateSeedTarget(
  nodeEnv: string | undefined,
  databaseUrl: string | undefined,
  allowRemote: boolean,
): URL {
  if (nodeEnv === "production") {
    throw new Error("O seed de demonstração não deve rodar em produção");
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não foi definida em .env.local");
  }

  const parsedDatabaseUrl = new URL(databaseUrl);

  if (!LOCAL_HOSTS.has(parsedDatabaseUrl.hostname) && !allowRemote) {
    throw new Error(
      `O seed é destinado ao banco local, e a DATABASE_URL aponta para ${parsedDatabaseUrl.hostname}. Se isso é intencional, repita com --allow-remote.`,
    );
  }

  return parsedDatabaseUrl;
}

function normalizedProduct(product: string): string {
  return product.toLocaleLowerCase("pt-BR");
}

function hasSameSeedSaleIdentity(
  candidate: SeedSaleIdentity,
  expected: SeedSaleIdentity,
): boolean {
  return (
    candidate.sellerId === expected.sellerId &&
    candidate.sellerCommissionRateId === expected.sellerCommissionRateId &&
    candidate.sellerRateBasisPoints === expected.sellerRateBasisPoints &&
    candidate.customerName === expected.customerName &&
    normalizedProduct(candidate.product) ===
      normalizedProduct(expected.product) &&
    candidate.soldOn === expected.soldOn &&
    candidate.creditAmountInCents === expected.creditAmountInCents &&
    candidate.firstInstallmentDueOn === expected.firstInstallmentDueOn
  );
}

export function findExistingDemoSale<T extends SeedSaleIdentity>(
  candidates: readonly T[],
  expected: SeedSaleIdentity,
  label: string,
): T | undefined {
  const matches = candidates.filter((candidate) =>
    hasSameSeedSaleIdentity(candidate, expected),
  );

  if (matches.length > 1) {
    throw new Error(
      `Mais de uma venda corresponde aos dados fictícios de ${label}; recrie o banco local antes de repetir o seed`,
    );
  }

  return matches[0];
}

export function findInstallmentIdsMissingInitialStatus(
  installmentIds: readonly string[],
  events: readonly SeedInstallmentStatusEvent[],
): string[] {
  const installmentIdsWithInitialStatus = new Set(
    events
      .filter(
        (event) =>
          event.sequence === 1 &&
          event.previousStatus === null &&
          event.status === "prevista",
      )
      .map((event) => event.installmentId),
  );

  return installmentIds.filter(
    (installmentId) => !installmentIdsWithInitialStatus.has(installmentId),
  );
}
