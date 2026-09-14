import { describe, expect, it } from "vitest";
import {
  findExistingDemoSale,
  findInstallmentIdsMissingInitialStatus,
  type SeedSaleIdentity,
  validateSeedTarget,
} from "./seed-support";

const EXPECTED_SALE: SeedSaleIdentity = {
  sellerId: "seller-1",
  sellerCommissionRateId: "rate-1",
  sellerRateBasisPoints: 150,
  customerName: "Cliente Fictício",
  product: "Imóvel",
  soldOn: "2026-01-15",
  creditAmountInCents: BigInt(20_000_000),
  firstInstallmentDueOn: "2026-02-15",
};

describe("validateSeedTarget", () => {
  it("recusa execução em produção", () => {
    expect(() =>
      validateSeedTarget(
        "production",
        "postgresql://postgres:postgres@localhost:5432/comissia",
        false,
      ),
    ).toThrow("não deve rodar em produção");
  });

  it("recusa banco remoto sem autorização explícita", () => {
    expect(() =>
      validateSeedTarget(
        "development",
        "postgresql://postgres:postgres@database.example.test:5432/comissia",
        false,
      ),
    ).toThrow("--allow-remote");
  });

  it("recusa banco remoto autorizado fora da homologação", () => {
    expect(() =>
      validateSeedTarget(
        "production",
        "postgresql://postgres:postgres@database.example.test:5432/comissia",
        true,
        "production",
      ),
    ).toThrow("DEPLOYMENT_ENV=staging");
  });

  it("aceita loopback IPv4, IPv6 e homologação remota autorizada", () => {
    expect(
      validateSeedTarget(
        "development",
        "postgresql://postgres:postgres@127.0.0.1:5432/comissia",
        false,
      ).hostname,
    ).toBe("127.0.0.1");
    expect(
      validateSeedTarget(
        "development",
        "postgresql://postgres:postgres@[::1]:5432/comissia",
        false,
      ).hostname,
    ).toBe("[::1]");
    expect(
      validateSeedTarget(
        "production",
        "postgresql://postgres:postgres@database.example.test:5432/comissia",
        true,
        "staging",
      ).hostname,
    ).toBe("database.example.test");
  });
});

describe("findExistingDemoSale", () => {
  it("não confunde uma recomercialização da mesma cota com a venda do seed", () => {
    const resale = {
      ...EXPECTED_SALE,
      id: "sale-resale",
      customerName: "Outro Cliente",
      soldOn: "2026-08-20",
    };

    expect(findExistingDemoSale([resale], EXPECTED_SALE, "G1/Q1")).toBe(
      undefined,
    );
  });

  it("localiza a venda fictícia entre outras vendas da mesma cota", () => {
    const demoSale = { ...EXPECTED_SALE, id: "sale-demo" };
    const resale = {
      ...EXPECTED_SALE,
      id: "sale-resale",
      customerName: "Outro Cliente",
    };

    expect(
      findExistingDemoSale([resale, demoSale], EXPECTED_SALE, "G1/Q1")?.id,
    ).toBe("sale-demo");
  });

  it("recusa duas cópias idênticas da venda fictícia", () => {
    expect(() =>
      findExistingDemoSale(
        [
          { ...EXPECTED_SALE, id: "sale-1" },
          { ...EXPECTED_SALE, id: "sale-2" },
        ],
        EXPECTED_SALE,
        "G1/Q1",
      ),
    ).toThrow("Mais de uma venda");
  });
});

describe("findInstallmentIdsMissingInitialStatus", () => {
  it("exige o evento inicial prevista de cada parcela", () => {
    const events = [
      {
        installmentId: "installment-1",
        sequence: 1,
        previousStatus: null,
        status: "prevista",
      },
      {
        installmentId: "installment-1",
        sequence: 2,
        previousStatus: "prevista",
        status: "paga",
      },
      {
        installmentId: "installment-2",
        sequence: 2,
        previousStatus: "prevista",
        status: "paga",
      },
    ];

    expect(
      findInstallmentIdsMissingInitialStatus(
        ["installment-1", "installment-2"],
        events,
      ),
    ).toEqual(["installment-2"]);
  });
});
