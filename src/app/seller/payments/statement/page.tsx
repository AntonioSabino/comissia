import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommissionStatement } from "@/app/_components/statement/commission-statement";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { isCompetence } from "@/modules/sales/application/monthly-commission-forecast";
import { buildPayoutClosing } from "@/modules/sales/application/payout-closing";
import { commissionStatementRepository } from "@/modules/sales/infrastructure/db/commission-statement-repository";

export const metadata: Metadata = {
  title: "Demonstrativo de comissões | Comissia",
};

type SellerStatementPageProps = {
  searchParams: Promise<{ competencia?: string | string[] }>;
};

export default async function SellerStatementPage({
  searchParams,
}: SellerStatementPageProps) {
  const user = await requirePageRole("seller");
  const { competencia } = await searchParams;

  if (!user.sellerId || !isCompetence(competencia)) {
    notFound();
  }

  // O vendedor vem da sessão e fecha o recorte: não há parâmetro de vendedor
  // que alcance o demonstrativo de outra pessoa.
  const installments = await commissionStatementRepository.listInstallments({
    sellerId: user.sellerId,
    competence: competencia,
  });

  return (
    <CommissionStatement
      kicker="Demonstrativo de comissões"
      title={user.name}
      competence={competencia}
      issuedOn={getBusinessDate()}
      closing={buildPayoutClosing(installments)}
      back={{ href: "/seller/payments", label: "Voltar para Pagamentos" }}
    />
  );
}
