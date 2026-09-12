import { describe, expect, it, vi } from "vitest";
import { AdministratorInstallmentRuleValidationError } from "../domain/administrator-installment-rule";
import type {
  AdministratorInstallmentRuleRepository,
  AdministratorInstallmentRuleVersion,
} from "./administrator-installment-rule-repository";
import { createAdministratorInstallmentRule } from "./create-administrator-installment-rule";
import {
  AdministratorNotFoundError,
  DuplicateAdministratorInstallmentRuleError,
  MissingAdministratorInstallmentRuleError,
} from "./errors";
import { findAdministratorInstallmentRuleOn } from "./find-administrator-installment-rule-on";

const ADMINISTRATOR_ID = "2f81455e-01cd-4b4f-8614-30fda79fd987";
const RULE_ID = "8f2b1c64-0a4d-4f4c-9c0e-2d0f5a1b7c33";

function createRepository(
  overrides: Partial<AdministratorInstallmentRuleRepository> = {},
): AdministratorInstallmentRuleRepository {
  return {
    create: vi.fn().mockResolvedValue({ id: RULE_ID }),
    listVersions: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function version(
  effectiveFrom: string,
  installmentRatesBasisPoints: number[],
): AdministratorInstallmentRuleVersion {
  return {
    id: `regua-${effectiveFrom}`,
    administratorId: ADMINISTRATOR_ID,
    product: "Auto Leve",
    effectiveFrom,
    installmentRatesBasisPoints,
  };
}

describe("createAdministratorInstallmentRule", () => {
  it("grava a vigência e devolve o percentual total da regra", async () => {
    const repository = createRepository();

    await expect(
      createAdministratorInstallmentRule(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "  Auto   Leve ",
          effectiveFrom: "2026-01-01",
          installmentRatesBasisPoints: [75, 50, 25],
        },
        { repository },
      ),
    ).resolves.toEqual({
      id: RULE_ID,
      administratorId: ADMINISTRATOR_ID,
      product: "Auto Leve",
      effectiveFrom: "2026-01-01",
      installmentRatesBasisPoints: [75, 50, 25],
      totalBasisPoints: 150,
    });
    expect(repository.create).toHaveBeenCalledWith({
      administratorId: ADMINISTRATOR_ID,
      product: "Auto Leve",
      effectiveFrom: "2026-01-01",
      installmentRatesBasisPoints: [75, 50, 25],
    });
  });

  it("recusa administradora inexistente", async () => {
    const repository = createRepository({
      create: vi.fn().mockResolvedValue(null),
    });

    await expect(
      createAdministratorInstallmentRule(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          effectiveFrom: "2026-01-01",
          installmentRatesBasisPoints: [150],
        },
        { repository },
      ),
    ).rejects.toBeInstanceOf(AdministratorNotFoundError);
  });

  it("propaga a sobreposição de vigências recusada pelo banco", async () => {
    const repository = createRepository({
      create: vi
        .fn()
        .mockRejectedValue(new DuplicateAdministratorInstallmentRuleError()),
    });

    await expect(
      createAdministratorInstallmentRule(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          effectiveFrom: "2026-01-01",
          installmentRatesBasisPoints: [150],
        },
        { repository },
      ),
    ).rejects.toBeInstanceOf(DuplicateAdministratorInstallmentRuleError);
  });

  it("recusa a distribuição inválida antes de consultar o banco", async () => {
    const repository = createRepository();

    await expect(
      createAdministratorInstallmentRule(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          effectiveFrom: "2026-01-01",
          installmentRatesBasisPoints: [75.5],
        },
        { repository },
      ),
    ).rejects.toBeInstanceOf(AdministratorInstallmentRuleValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe("findAdministratorInstallmentRuleOn", () => {
  const january = version("2026-01-01", [75, 50, 25]);
  const june = version("2026-06-01", [100, 100]);

  it("encontra a vigência válida na data com o percentual total", async () => {
    const repository = createRepository({
      listVersions: vi.fn().mockResolvedValue([january, june]),
    });

    await expect(
      findAdministratorInstallmentRuleOn(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          date: "2026-09-10",
        },
        { repository },
      ),
    ).resolves.toEqual({ ...june, totalBasisPoints: 200 });
    expect(repository.listVersions).toHaveBeenCalledWith(
      ADMINISTRATOR_ID,
      "Auto Leve",
    );
  });

  it("não depende da ordem devolvida pelo repositório", async () => {
    const repository = createRepository({
      listVersions: vi.fn().mockResolvedValue([june, january]),
    });

    await expect(
      findAdministratorInstallmentRuleOn(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          date: "2026-09-10",
        },
        { repository },
      ),
    ).resolves.toMatchObject({ id: june.id });
  });

  it("considera válida a vigência que começa na própria data", async () => {
    const repository = createRepository({
      listVersions: vi.fn().mockResolvedValue([january, june]),
    });

    await expect(
      findAdministratorInstallmentRuleOn(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          date: "2026-06-01",
        },
        { repository },
      ),
    ).resolves.toMatchObject({ id: june.id });
  });

  it("mantém a régua de uma data antiga quando surge vigência nova", async () => {
    const repository = createRepository({
      listVersions: vi.fn().mockResolvedValue([january, june]),
    });

    await expect(
      findAdministratorInstallmentRuleOn(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          date: "2026-03-15",
        },
        { repository },
      ),
    ).resolves.toEqual({ ...january, totalBasisPoints: 150 });
  });

  it("informa quando não existe régua vigente na data", async () => {
    const repository = createRepository({
      listVersions: vi.fn().mockResolvedValue([june]),
    });

    await expect(
      findAdministratorInstallmentRuleOn(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Auto Leve",
          date: "2026-05-31",
        },
        { repository },
      ),
    ).rejects.toBeInstanceOf(MissingAdministratorInstallmentRuleError);
  });

  it("informa quando a administradora não tem régua para o produto", async () => {
    const repository = createRepository();

    await expect(
      findAdministratorInstallmentRuleOn(
        {
          administratorId: ADMINISTRATOR_ID,
          product: "Imóvel Premiado",
          date: "2026-09-10",
        },
        { repository },
      ),
    ).rejects.toBeInstanceOf(MissingAdministratorInstallmentRuleError);
  });
});
