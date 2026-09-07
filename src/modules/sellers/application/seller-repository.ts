import type { ValidSellerRegistration } from "../domain/seller-registration";

export type SellerListItem = {
  id: string;
  name: string;
  document: string;
  email: string;
  active: boolean;
  rateBasisPoints: number | null;
  effectiveFrom: string | null;
};

export interface SellerRepository {
  isDocumentInUse(document: string): Promise<boolean>;
  isEmailInUse(email: string): Promise<boolean>;
  createWithInitialRate(
    seller: ValidSellerRegistration,
  ): Promise<{ id: string }>;
  list(): Promise<SellerListItem[]>;
}
