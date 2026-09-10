import type {
  AdministratorListItem,
  AdministratorRepository,
} from "./administrator-repository";

/** Administradoras disponíveis para novas vendas. */
export async function listActiveAdministrators({
  repository,
}: {
  repository: Pick<AdministratorRepository, "list">;
}): Promise<AdministratorListItem[]> {
  return repository.list({ active: true });
}
