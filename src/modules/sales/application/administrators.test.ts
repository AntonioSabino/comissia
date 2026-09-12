import { describe, expect, it, vi } from "vitest";
import { AdministratorValidationError } from "../domain/administrator-name";
import type { AdministratorRepository } from "./administrator-repository";
import { changeAdministratorStatus } from "./change-administrator-status";
import { createAdministrator } from "./create-administrator";
import {
  AdministratorNotFoundError,
  AdministratorStatusValidationError,
  DuplicateAdministratorError,
} from "./errors";
import { selectActiveAdministrators } from "./active-administrators";

const ADMINISTRATOR_ID = "2f81455e-01cd-4b4f-8614-30fda79fd987";

function createRepository(
  overrides: Partial<AdministratorRepository> = {},
): AdministratorRepository {
  return {
    isNameInUse: vi.fn().mockResolvedValue(false),
    create: vi.fn().mockResolvedValue({ id: ADMINISTRATOR_ID }),
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    setActive: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("createAdministrator", () => {
  it("cadastra a administradora com o nome normalizado", async () => {
    const repository = createRepository();

    await expect(
      createAdministrator({ name: "  Porto   Consórcio " }, { repository }),
    ).resolves.toEqual({ id: ADMINISTRATOR_ID });
    expect(repository.isNameInUse).toHaveBeenCalledWith("Porto Consórcio");
    expect(repository.create).toHaveBeenCalledWith("Porto Consórcio");
  });

  it("recusa nome já cadastrado", async () => {
    const repository = createRepository({
      isNameInUse: vi.fn().mockResolvedValue(true),
    });

    await expect(
      createAdministrator({ name: "Porto Consórcio" }, { repository }),
    ).rejects.toBeInstanceOf(DuplicateAdministratorError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("recusa nome inválido antes de consultar o banco", async () => {
    const repository = createRepository();

    await expect(
      createAdministrator({ name: " " }, { repository }),
    ).rejects.toBeInstanceOf(AdministratorValidationError);
    expect(repository.isNameInUse).not.toHaveBeenCalled();
  });
});

describe("changeAdministratorStatus", () => {
  it.each([true, false])("altera a situação para %s", async (active) => {
    const repository = createRepository();

    await expect(
      changeAdministratorStatus(
        { administratorId: ADMINISTRATOR_ID, active },
        { repository },
      ),
    ).resolves.toEqual({ id: ADMINISTRATOR_ID, active });
    expect(repository.setActive).toHaveBeenCalledWith(ADMINISTRATOR_ID, active);
  });

  it("recusa identificador inválido", async () => {
    const repository = createRepository();

    await expect(
      changeAdministratorStatus(
        { administratorId: "porto", active: false },
        { repository },
      ),
    ).rejects.toBeInstanceOf(AdministratorStatusValidationError);
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("recusa situação que não seja booleana", async () => {
    const repository = createRepository();

    await expect(
      changeAdministratorStatus(
        { administratorId: ADMINISTRATOR_ID, active: "false" },
        { repository },
      ),
    ).rejects.toBeInstanceOf(AdministratorStatusValidationError);
    expect(repository.setActive).not.toHaveBeenCalled();
  });

  it("informa quando a administradora não existe", async () => {
    const repository = createRepository({
      setActive: vi.fn().mockResolvedValue(false),
    });

    await expect(
      changeAdministratorStatus(
        { administratorId: ADMINISTRATOR_ID, active: false },
        { repository },
      ),
    ).rejects.toBeInstanceOf(AdministratorNotFoundError);
  });
});

describe("selectActiveAdministrators", () => {
  it("mantém somente administradoras ativas", () => {
    const administrators = [
      { id: "1", name: "Aurora", active: true },
      { id: "2", name: "Meridiano", active: false },
      { id: "3", name: "Vega", active: true },
    ];

    expect(
      selectActiveAdministrators(administrators).map(({ name }) => name),
    ).toEqual(["Aurora", "Vega"]);
  });

  it("preserva a lista recebida", () => {
    const administrators = [{ id: "1", name: "Aurora", active: true }];

    expect(selectActiveAdministrators(administrators)).not.toBe(administrators);
    expect(administrators).toHaveLength(1);
  });
});
