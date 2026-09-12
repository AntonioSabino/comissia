import type { ValidSellerCommissionRate } from "../domain/seller-commission-rate";
import type { ValidSellerProfile } from "../domain/seller-profile";
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
  currentRateId: string | null;
  commissionRates: SellerCommissionRateListItem[];
};

export interface SellerRepository {
  isDocumentInUse(document: string, exceptSellerId?: string): Promise<boolean>;
  isEmailInUse(email: string, exceptSellerId?: string): Promise<boolean>;
  createWithInitialRate(
    seller: ValidSellerRegistration,
  ): Promise<{ id: string }>;
  list(filters?: SellerListFilters): Promise<SellerListItem[]>;
  findById(id: string): Promise<SellerDetails | null>;
  setActive(id: string, active: boolean): Promise<boolean>;
  /**
   * Atualiza o cadastro e, quando existir, a identidade da conta vinculada na
   * mesma transação.
   */
  updateProfile(id: string, profile: ValidSellerProfile): Promise<boolean>;
  addCommissionRate(
    sellerId: string,
    rate: ValidSellerCommissionRate,
  ): Promise<{ id: string } | null>;
  listCommissionRates(
    sellerId: string,
  ): Promise<SellerCommissionRateListItem[]>;
}
