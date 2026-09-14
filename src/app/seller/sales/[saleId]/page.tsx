import { ArrowLeft, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/app/_components/ui/alert";
import { ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable } from "@/app/_components/ui/data-table";
import {
  PageBody,
  PageHeader,
  TwoColumn,
} from "@/app/_components/ui/page-layout";
import { EmptyState, ErrorState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import {
  formatBasisPoints,
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
} from "@/app/_utils/installment-status";
import { QUOTA_STATUS_LABELS, QUOTA_STATUS_TONES } from "@/app/_utils/quota";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { calculateSellerCommissionTotal } from "@/modules/commissions";
import { sumInstallmentAmounts } from "@/modules/sales/application/installment-totals";
import { isCompetence } from "@/modules/sales/application/monthly-commission-forecast";
import { sellerCommissionRepository } from "@/modules/sales/infrastructure/db/seller-commission-repository";
import { isUuid } from "@/shared/uuid";
import styles from "./seller-sale.module.css";

export const metadata: Metadata = {
  title: "Detalhes da venda | Comissia",
};

function formatInstallmentCount(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

type SellerSalePageProps = {
  params: Promise<{ saleId: string }>;
  searchParams: Promise<{
    competencia?: string | string[];
    origem?: string | string[];
  }>;
};

export default async function SellerSalePage({
  params,
  searchParams,
}: SellerSalePageProps) {
  const user = await requirePageRole("seller");
  const { saleId } = await params;
  const { competencia, origem } = await searchParams;
  const from = Array.isArray(competencia) ? competencia[0] : competencia;
  const origin = Array.isArray(origem) ? origem[0] : origem;
  // A tela de onde o vendedor veio volta com ele. Nada da URL é devolvido ao
  // navegador sem passar por um crivo: a origem é comparada com um valor
  // conhecido e a competência só é aceita no formato AAAA-MM.
  const cameFromSales = origin === "vendas";
  const backHref = cameFromSales
    ? "/seller/sales"
    : isCompetence(from)
      ? `/seller/commissions?competencia=${from}`
      : "/seller/commissions";
  const backLabel = cameFromSales ? "Vendas e comissões" : "Previsão mensal";

  if (!user.sellerId) {
    return (
      <>
        <PageHeader eyebrow="Área do vendedor" title="Detalhes da venda" />
        <PageBody>
          <Card flush>
            <ErrorState
              title="Sua conta ainda não está ligada a um cadastro de vendedor"
              description="Peça à administração para vincular o seu acesso ao seu cadastro; sem isso não há vendas para mostrar."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  if (!isUuid(saleId)) {
    notFound();
  }

  // A consulta filtra pelo vendedor da sessão: venda de outro vendedor não é
  // encontrada, em vez de ser negada — trocar o identificador na URL não
  // confirma que ela existe.
  const sale = await sellerCommissionRepository.findSale(saleId, user.sellerId);

  if (!sale) {
    notFound();
  }

  const commissionInCents = calculateSellerCommissionTotal({
    creditAmountInCents: sale.creditAmountInCents,
    sellerRateBasisPoints: sale.sellerRateBasisPoints,
  });
  const installmentsInCents = sumInstallmentAmounts(sale.installments);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: backLabel, href: backHref },
          { label: sale.code },
        ]}
        eyebrow="Sua venda"
        title={sale.code}
        subtitle={`${sale.customerName} · ${sale.product}`}
        actions={
          <ButtonLink href={backHref} variant="secondary" icon={ArrowLeft}>
            {cameFromSales ? "Voltar para as vendas" : "Voltar para a previsão"}
          </ButtonLink>
        }
      />

      <PageBody>
        <TwoColumn>
          <div className={styles.stack}>
            <Card aria-labelledby="seller-sale-data-title">
              <CardHeading
                titleId="seller-sale-data-title"
                kicker="Venda"
                title="Dados da venda"
              />

              <dl className={styles.summary}>
                <div>
                  <dt>Data da venda</dt>
                  <dd className="num">{formatBusinessDate(sale.soldOn)}</dd>
                </div>
                <div>
                  <dt>Situação da cota</dt>
                  <dd>
                    <StatusBadge tone={QUOTA_STATUS_TONES[sale.quotaStatus]}>
                      {QUOTA_STATUS_LABELS[sale.quotaStatus]}
                    </StatusBadge>
                  </dd>
                </div>
                <div>
                  <dt>Crédito vendido</dt>
                  <dd className="num">
                    {formatCents(sale.creditAmountInCents)}
                  </dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>{sale.customerName}</dd>
                </div>
                <div>
                  <dt>Produto</dt>
                  <dd>{sale.product}</dd>
                </div>
                <div>
                  <dt>Grupo/cota</dt>
                  <dd className="num">
                    {sale.groupCode}/{sale.quotaCode}
                  </dd>
                </div>
                <div>
                  <dt>Administradora</dt>
                  <dd>{sale.administratorName}</dd>
                </div>
                <div>
                  <dt>Primeira previsão</dt>
                  <dd className="num">
                    {formatBusinessDate(sale.firstInstallmentDueOn)}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card flush aria-labelledby="seller-sale-installments-title">
              <CardHeading
                titleId="seller-sale-installments-title"
                kicker={
                  sale.installments.length > 0
                    ? `${formatInstallmentCount(sale.installments.length)} · ${formatCents(installmentsInCents)}`
                    : "Nenhuma parcela"
                }
                title="Suas parcelas"
                description="Da primeira à última, como foram geradas no cadastro da venda."
              />

              {sale.installments.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Esta venda não tem parcelas geradas"
                  description="Ela foi registrada antes de as parcelas passarem a ser geradas automaticamente. Fale com a administração para saber como ela será paga."
                />
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <th>Parcela</th>
                      <th>Competência</th>
                      <th>Previsão</th>
                      <th>Valor</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.installments.map((installment) => (
                      <tr key={installment.id}>
                        <td className="num">
                          {installment.number}/{sale.installments.length}
                        </td>
                        <td className="num">
                          {formatCompetence(installment.competence)}
                        </td>
                        <td className="num">
                          {formatBusinessDate(installment.dueOn)}
                        </td>
                        <td className="num">
                          {formatCents(installment.amountInCents)}
                        </td>
                        <td>
                          <StatusBadge
                            tone={INSTALLMENT_STATUS_TONES[installment.status]}
                          >
                            {INSTALLMENT_STATUS_LABELS[installment.status]}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </Card>
          </div>

          <Card aria-labelledby="seller-sale-commission-title">
            <CardHeading
              titleId="seller-sale-commission-title"
              kicker="Sua comissão"
              title="Como o valor foi calculado"
              description="Pelo percentual acordado com você, vigente na data da venda. Mudanças posteriores no acordo não recalculam esta venda."
            />

            <dl className={styles.snapshot}>
              <div>
                <dt>Seu percentual</dt>
                <dd className="num">
                  {formatBasisPoints(sale.sellerRateBasisPoints)}
                  <span className={styles.origin}>
                    Vigente desde{" "}
                    {formatBusinessDate(sale.sellerRateEffectiveFrom)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Comissão desta venda</dt>
                <dd className="num">{formatCents(commissionInCents)}</dd>
              </div>
              {sale.installments.length > 0 ? (
                <div>
                  <dt>Soma das parcelas</dt>
                  <dd className="num">{formatCents(installmentsInCents)}</dd>
                </div>
              ) : null}
            </dl>

            {sale.installments.length === 0 ? (
              <Alert tone="attention">
                Esta venda não tem parcelas geradas, então não há datas nem
                valores por mês para comparar com a comissão. A administração
                pode informar como ela será paga.
              </Alert>
            ) : installmentsInCents !== commissionInCents ? (
              <Alert tone="attention">
                A soma das parcelas está diferente da comissão calculada. Avise
                a administração para conferir esta venda.
              </Alert>
            ) : null}
          </Card>
        </TwoColumn>
      </PageBody>
    </>
  );
}
