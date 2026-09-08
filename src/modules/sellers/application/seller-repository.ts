import type { ValidSellerRegistration } from "../domain/seller-registration";

export type SellerListFilters = {
  search?: string;
  active?: boolean;
};

export type SellerListItem = {
  id: string;
  name: string;
  document: string;
  email: string;
  active: boolean;
  rateBasisPoints: number | null;
  effectiveFrom: string | null;
};

export type SellerCommissionRateListItem = {
  id: string;
  rateBasisPoints: number;
  effectiveFrom: string;
};

export type SellerDetails = {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string | null;
  active: boolean;
  rateBasisPoints: number | null;
  effectiveFrom: string | null;
  commissionRates: SellerCommissionRateListItem[];
};

export interface SellerRepository {
  isDocumentInUse(document: string): Promise<boolean>;
  isEmailInUse(email: string): Promise<boolean>;
  createWithInitialRate(
    seller: ValidSellerRegistration,
  ): Promise<{ id: string }>;
  list(filters?: SellerListFilters): Promise<SellerListItem[]>;
  findById(id: string): Promise<SellerDetails | null>;
  setActive(id: string, active: boolean): Promise<boolean>;
}
