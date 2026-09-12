import { describe, expect, it, vi } from "vitest";
import { AdministratorInstallmentRuleValidationError } from "../domain/administrator-installment-rule";
import type {
  AdministratorInstallmentRuleRepository,
  AdministratorInstallmentRuleVersion,
} from "./administrator-installment-rule-repository";
import { createAdministratorInstallmentRule } from "./create-administrator-installment-rule";
import { describeInstallmentRules } from "./current-installment-rules";
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
    create: vi.fn().mockResolvedValue({ status: "created", id: RULE_ID }),
    listVersions: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
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
      create: vi.fn().mockResolvedValue({ status: "unknown-administrator" }),
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

  it("recusa administradora inativa apontando o campo", async () => {
    const repository = createRepository({
      create: vi.fn().mockResolvedValue({ status: "inactive-administrator" }),
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
    ).rejects.toMatchObject({
      name: "AdministratorInstallmentRuleValidationError",
      fieldErrors: { administratorId: expect.any(String) },
    });
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

describe("describeInstallmentRules", () => {
  const TODAY = "2026-09-12";

  function listed(
    id: string,
    product: string,
    effectiveFrom: string,
    installmentRatesBasisPoints: number[],
    administratorId = ADMINISTRATOR_ID,
  ) {
    return {
      id,
      administratorId,
      administratorName: "Aurora Consórcio",
      product,
      effectiveFrom,
      installmentRatesBasisPoints,
    };
  }

  it("marca a vigência válida hoje e soma a distribuição", () => {
    const rules = [
      listed("b", "Auto Leve", "2026-06-01", [100, 100]),
      listed("a", "Auto Leve", "2026-01-01", [75, 50, 25]),
    ];

    expect(
      describeInstallmentRules(rules, TODAY).map(
        ({ id, current, totalBasisPoints }) => ({
          id,
          current,
          totalBasisPoints,
        }),
      ),
    ).toEqual([
      { id: "b", current: true, totalBasisPoints: 200 },
      { id: "a", current: false, totalBasisPoints: 150 },
    ]);
  });

  it("preserva a ordem recebida e não depende dela", () => {
    const rules = [
      listed("a", "Auto Leve", "2026-01-01", [150]),
      listed("b", "Auto Leve", "2026-06-01", [200]),
    ];

    expect(describeInstallmentRules(rules, TODAY).map(({ id }) => id)).toEqual([
      "a",
      "b",
    ]);
    expect(
      describeInstallmentRules(rules, TODAY).find(({ current }) => current)?.id,
    ).toBe("b");
  });

  it("marca uma vigência por produto", () => {
    const rules = [
      listed("auto", "Auto Leve", "2026-01-01", [150]),
      listed("imovel", "Imóvel Premiado", "2026-02-01", [200]),
    ];

    expect(
      describeInstallmentRules(rules, TODAY).every(({ current }) => current),
    ).toBe(true);
  });

  it("trata o mesmo produto em outra caixa como o mesmo grupo", () => {
    const rules = [
      listed("antiga", "Auto Leve", "2026-01-01", [150]),
      listed("atual", "AUTO leve", "2026-06-01", [200]),
    ];

    expect(
      describeInstallmentRules(rules, TODAY).filter(({ current }) => current),
    ).toHaveLength(1);
  });

  it("separa grupos de administradoras diferentes", () => {
    const rules = [
      listed("aurora", "Auto Leve", "2026-01-01", [150]),
      listed(
        "meridiano",
        "Auto Leve",
        "2026-02-01",
        [200],
        "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      ),
    ];

    expect(
      describeInstallmentRules(rules, TODAY).every(({ current }) => current),
    ).toBe(true);
  });

  it("não marca nenhuma quando todas as vigências são futuras", () => {
    const rules = [listed("futura", "Auto Leve", "2026-12-01", [150])];

    expect(
      describeInstallmentRules(rules, TODAY).some(({ current }) => current),
    ).toBe(false);
  });

  it("aceita lista vazia", () => {
    expect(describeInstallmentRules([], TODAY)).toEqual([]);
  });
});
