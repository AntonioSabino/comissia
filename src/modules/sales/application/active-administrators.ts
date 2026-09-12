import type { AdministratorListItem } from "./administrator-repository";

/**
 * Administradoras disponíveis para novas vendas. Recebe a lista já carregada
 * para que a mesma leitura sirva ao formulário e aos filtros, que mostram
 * também as inativas.
 */
export function selectActiveAdministrators(
  administrators: readonly AdministratorListItem[],
): AdministratorListItem[] {
  return administrators.filter((administrator) => administrator.active);
}
