export type SellerAccess = {
  userId: string;
  sellerId: string;
  email: string;
  active: boolean;
};

export type NewSellerAccess = {
  sellerId: string;
  name: string;
  email: string;
  passwordHash: string;
};

export type SellerAccessCreationResult =
  | { status: "created"; access: SellerAccess }
  | { status: "access-already-exists" }
  | { status: "email-in-use" }
  | { status: "seller-not-found" };

export interface SellerAccessRepository {
  findBySellerId(sellerId: string): Promise<SellerAccess | null>;
  createSellerAccess(
    access: NewSellerAccess,
  ): Promise<SellerAccessCreationResult>;
  /**
   * Libera ou bloqueia o acesso. Bloquear encerra as sessões abertas do
   * vendedor na mesma operação. Devolve `null` quando o vendedor não tem
   * acesso criado.
   */
  setSellerAccessActive(
    sellerId: string,
    active: boolean,
  ): Promise<SellerAccess | null>;
}
