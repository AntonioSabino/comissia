export type SellerOption = {
  id: string;
  name: string;
};

/** Leitura mínima para selects que precisam identificar um vendedor. */
export interface SellerOptionRepository {
  listOptions(): Promise<SellerOption[]>;
}
