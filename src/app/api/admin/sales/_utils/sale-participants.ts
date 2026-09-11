import type { SaleParticipants } from "@/modules/sales/application/create-sale";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";
import {
  findCommissionRateOn,
  MissingCommissionRateError,
} from "@/modules/sellers";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";

/** Liga o cadastro de venda aos módulos de vendedores e de administradoras. */
export const saleParticipants: SaleParticipants = {
  async isAdministratorActive(administratorId) {
    const administrator =
      await administratorRepository.findById(administratorId);

    return administrator?.active ?? false;
  },

  async isSellerActive(sellerId) {
    const seller = await sellerRepository.findById(sellerId);

    return seller?.active ?? false;
  },

  async findCommissionRateOn(sellerId, date) {
    try {
      return await findCommissionRateOn(
        { sellerId, date },
        { repository: sellerRepository },
      );
    } catch (error) {
      if (error instanceof MissingCommissionRateError) {
        return null;
      }

      throw error;
    }
  },
};
