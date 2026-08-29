import {
  validateSellerRegistration,
  type SellerRegistrationInput,
} from "../domain/seller-registration";
import { DuplicateSellerError } from "./errors";
import type { SellerRepository } from "./seller-repository";

type CreateSellerDependencies = {
  repository: SellerRepository;
};

export async function createSeller(
  input: SellerRegistrationInput,
  { repository }: CreateSellerDependencies,
): Promise<{ id: string }> {
  const seller = validateSellerRegistration(input);

  if (await repository.isDocumentInUse(seller.document)) {
    throw new DuplicateSellerError("document");
  }

  if (await repository.isEmailInUse(seller.email)) {
    throw new DuplicateSellerError("email");
  }

  return repository.createWithInitialRate(seller);
}
