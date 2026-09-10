export type AdministratorListItem = {
  id: string;
  name: string;
  active: boolean;
};

export type AdministratorListFilters = {
  active?: boolean;
};

export interface AdministratorRepository {
  /** Compara sem diferenciar maiúsculas de minúsculas. */
  isNameInUse(name: string): Promise<boolean>;
  create(name: string): Promise<{ id: string }>;
  list(filters?: AdministratorListFilters): Promise<AdministratorListItem[]>;
  setActive(id: string, active: boolean): Promise<boolean>;
}
