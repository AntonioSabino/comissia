import { validateAdministratorName } from "../domain/administrator-name";
import type { AdministratorRepository } from "./administrator-repository";
import { DuplicateAdministratorError } from "./errors";

type CreateAdministratorDependencies = {
  repository: AdministratorRepository;
};

export async function createAdministrator(
  input: { name?: unknown },
  { repository }: CreateAdministratorDependencies,
): Promise<{ id: string }> {
  const name = validateAdministratorName(input.name);

  if (await repository.isNameInUse(name)) {
    throw new DuplicateAdministratorError();
  }

  return repository.create(name);
}
