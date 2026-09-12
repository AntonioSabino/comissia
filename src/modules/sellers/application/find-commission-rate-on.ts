import { findRuleValidOn } from "@/shared/effective-dated-rule";
import { MissingCommissionRateError } from "./errors";
import type {
  SellerCommissionRateListItem,
  SellerRepository,
} from "./seller-repository";

type FindCommissionRateOnDependencies = {
  repository: Pick<SellerRepository, "listCommissionRates">;
};

/**
 * Percentual do vendedor válido na data da venda, que o módulo de vendas grava
 * como snapshot. Sem vigência nessa data, a venda não pode ser calculada.
 */
export async function findCommissionRateOn(
  { sellerId, date }: { sellerId: string; date: string },
  { repository }: FindCommissionRateOnDependencies,
): Promise<SellerCommissionRateListItem> {
  const rates = await repository.listCommissionRates(sellerId);
  const rate = findRuleValidOn(rates, date);

  if (!rate) {
    throw new MissingCommissionRateError();
  }

  return rate;
}
