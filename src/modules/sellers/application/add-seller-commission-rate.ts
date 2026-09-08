import {
  validateSellerCommissionRate,
  type SellerCommissionRateInput,
} from "../domain/seller-commission-rate";
import { isSellerId } from "../domain/seller-id";
import { InvalidSellerIdError, SellerNotFoundError } from "./errors";
import type { SellerRepository } from "./seller-repository";

type AddSellerCommissionRateDependencies = {
  repository: SellerRepository;
};

export async function addSellerCommissionRate(
  input: SellerCommissionRateInput & { sellerId: unknown },
  { repository }: AddSellerCommissionRateDependencies,
): Promise<{ id: string; rateBasisPoints: number; effectiveFrom: string }> {
  if (!isSellerId(input.sellerId)) {
    throw new InvalidSellerIdError();
  }

  const rate = validateSellerCommissionRate(input);
  const created = await repository.addCommissionRate(input.sellerId, rate);

  if (!created) {
    throw new SellerNotFoundError();
  }

  return { id: created.id, ...rate };
}
