import { isUuid } from "@/shared/uuid";
import type { AdministratorRepository } from "./administrator-repository";
import {
  AdministratorNotFoundError,
  AdministratorStatusValidationError,
} from "./errors";

type ChangeAdministratorStatusDependencies = {
  repository: AdministratorRepository;
};

export async function changeAdministratorStatus(
  input: { administratorId: unknown; active: unknown },
  { repository }: ChangeAdministratorStatusDependencies,
): Promise<{ id: string; active: boolean }> {
  if (!isUuid(input.administratorId)) {
    throw new AdministratorStatusValidationError(
      "Identificador da administradora inválido",
    );
  }

  if (typeof input.active !== "boolean") {
    throw new AdministratorStatusValidationError(
      "Informe se a administradora deve ficar ativa ou inativa",
    );
  }

  const updated = await repository.setActive(
    input.administratorId,
    input.active,
  );

  if (!updated) {
    throw new AdministratorNotFoundError();
  }

  return { id: input.administratorId, active: input.active };
}
