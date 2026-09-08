import { isSellerId } from "../domain/seller-id";
import {
  validateSellerProfile,
  type SellerProfileInput,
} from "../domain/seller-profile";
import {
  DuplicateSellerError,
  InvalidSellerIdError,
  SellerNotFoundError,
} from "./errors";
import type { SellerRepository } from "./seller-repository";

type UpdateSellerDependencies = {
  repository: SellerRepository;
};

export async function updateSeller(
  input: SellerProfileInput & { sellerId: unknown },
  { repository }: UpdateSellerDependencies,
): Promise<{ id: string }> {
  if (!isSellerId(input.sellerId)) {
    throw new InvalidSellerIdError();
  }

  const sellerId = input.sellerId;
  const profile = validateSellerProfile(input);

  if (await repository.isDocumentInUse(profile.document, sellerId)) {
    throw new DuplicateSellerError("document");
  }

  if (await repository.isEmailInUse(profile.email, sellerId)) {
    throw new DuplicateSellerError("email");
  }

  if (!(await repository.updateProfile(sellerId, profile))) {
    throw new SellerNotFoundError();
  }

  return { id: sellerId };
}
