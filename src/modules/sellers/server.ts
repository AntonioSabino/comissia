import { listSellerOptions as listSellerOptionsUseCase } from "./application/list-seller-options";
import type { SellerOption } from "./application/seller-option-repository";
import { sellerOptionRepository } from "./infrastructure/db/seller-option-repository";

/** API pública do servidor para opções de vendedor. */
export function listSellerOptions(): Promise<SellerOption[]> {
  return listSellerOptionsUseCase({ repository: sellerOptionRepository });
}

export type { SellerOption } from "./application/seller-option-repository";
