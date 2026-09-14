import type {
  SellerOption,
  SellerOptionRepository,
} from "./seller-option-repository";

type ListSellerOptionsDependencies = {
  repository: SellerOptionRepository;
};

/**
 * Expõe somente identificador e nome, sem carregar cadastro ou histórico de
 * percentuais que não participam da escolha de um filtro.
 */
export function listSellerOptions({
  repository,
}: ListSellerOptionsDependencies): Promise<SellerOption[]> {
  return repository.listOptions();
}
