import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommissionStatement } from "@/app/_components/statement/commission-statement";
import { formatCompetence } from "@/app/_utils/format";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { isCompetence } from "@/modules/sales/application/monthly-commission-forecast";
import { buildPayoutClosing } from "@/modules/sales/application/payout-closing";
import { commissionStatementRepository } from "@/modules/sales/infrastructure/db/commission-statement-repository";
import { isSellerId } from "@/modules/sellers/domain/seller-id";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";

export const metadata: Metadata = {
  title: "Demonstrativo de comissões | Comissia",
};

type PayoutStatementPageProps = {
  searchParams: Promise<{
    competencia?: string | string[];
    vendedor?: string | string[];
  }>;
};

/**
 * Sem vendedor, é a conferência do fechamento: todos os vendedores do mês, com
 * subtotais. Com vendedor, é o demonstrativo dele, igual ao que ele baixa na
 * própria área.
 */
export default async function PayoutStatementPage({
  searchParams,
}: PayoutStatementPageProps) {
  await requirePageRole("admin");
  const { competencia, vendedor } = await searchParams;

  if (!isCompetence(competencia)) {
    notFound();
  }

  const back = {
    href: `/admin/payouts?competencia=${competencia}`,
    label: "Voltar para Repasses",
  };

  if (vendedor === undefined) {
    const installments = await commissionStatementRepository.listInstallments({
      competence: competencia,
    });

    return (
      <CommissionStatement
        kicker="Conferência do fechamento"
        title={`Fechamento ${formatCompetence(competencia)}`}
        competence={competencia}
        issuedOn={getBusinessDate()}
        closing={buildPayoutClosing(installments)}
        groupBySeller
        back={back}
      />
    );
  }

  if (!isSellerId(vendedor)) {
    notFound();
  }

  const installments = await commissionStatementRepository.listInstallments({
    sellerId: vendedor,
    competence: competencia,
  });
  // Um mês sem parcelas ainda tem demonstrativo (vazio); o nome vem então do
  // cadastro, e um vendedor inexistente é 404.
  const sellerName =
    installments[0]?.sellerName ??
    (await sellerRepository.findById(vendedor))?.name;

  if (!sellerName) {
    notFound();
  }

  return (
    <CommissionStatement
      kicker="Demonstrativo de comissões"
      title={sellerName}
      competence={competencia}
      issuedOn={getBusinessDate()}
      closing={buildPayoutClosing(installments)}
      back={back}
    />
  );
}
