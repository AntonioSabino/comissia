import { redirect } from "next/navigation";
import { isCompetence } from "@/modules/sales/application/monthly-commission-forecast";

type SellerCommissionsPageProps = {
  searchParams: Promise<{ competencia?: string | string[] }>;
};

/**
 * A Previsão mensal virou parte de Pagamentos (SCRUM-78). A rota continua
 * existindo para que links e favoritos antigos, com a competência, sigam
 * abrindo o mesmo mês.
 */
export default async function SellerCommissionsPage({
  searchParams,
}: SellerCommissionsPageProps) {
  const { competencia } = await searchParams;

  redirect(
    isCompetence(competencia)
      ? `/seller/payments?competencia=${competencia}`
      : "/seller/payments",
  );
}
