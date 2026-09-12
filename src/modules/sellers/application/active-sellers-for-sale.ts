import type { SellerListItem } from "./seller-repository";

/**
 * Vendedores que podem receber uma nova venda. Recebe a lista já carregada
 * para que a mesma leitura sirva ao formulário e a telas que precisam mostrar
 * também os inativos.
 */
export function selectActiveSellersForSale(
  sellers: readonly SellerListItem[],
): SellerListItem[] {
  return sellers.filter((seller) => seller.active);
}
