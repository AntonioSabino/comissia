import type { SellerListItem, SellerRepository } from "./seller-repository";

export async function listActiveSellersForSale(dependencies: {
  repository: SellerRepository;
}): Promise<SellerListItem[]> {
  return dependencies.repository.list({ active: true });
}
