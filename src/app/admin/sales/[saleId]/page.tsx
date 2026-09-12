import { ArrowLeft, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { EmptyState } from "@/app/_components/ui/state-block";
import {
  StatusBadge,
  type StatusTone,
} from "@/app/_components/ui/status-badge";
import {
  formatBasisPoints,
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/admin/_utils/format";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import {
  calculateSellerCommissionTotal,
  type CommissionInstallmentStatus,
} from "@/modules/commissions";
import { type QuotaStatus } from "@/modules/sales";
import type { SaleDetails } from "@/modules/sales/application/sale-repository";
import { saleRepository } from "@/modules/sales/infrastructure/db/sale-repository";
import { isUuid } from "@/shared/uuid";
import styles from "./sale-details.module.css";

export const metadata: Metadata = {
  title: "Detalhes da venda | Comissia",
};

const QUOTA_STATUS_LABELS: Record<QuotaStatus, string> = {
  adimplente: "Adimplente",
  inadimplente: "Inadimplente",
  cancelado: "Cancelada",
  contemplado: "Contemplada",
};

const QUOTA_STATUS_TONES: Record<QuotaStatus, StatusTone> = {
  adimplente: "received",
  inadimplente: "pending",
  cancelado: "cancelled",
  contemplado: "reconciled",
};

const INSTALLMENT_STATUS_LABELS: Record<CommissionInstallmentStatus, string> = {
  prevista: "Prevista",
  programada: "Programada",
  paga: "Paga",
  cancelada: "Cancelada",
  ajustada: "Ajustada",
};

const INSTALLMENT_STATUS_TONES: Record<
  CommissionInstallmentStatus,
  StatusTone
> = {
  prevista: "pending",
  programada: "reconciled",
  paga: "received",
  cancelada: "cancelled",
  ajustada: "neutral",
};

function formatInstallmentCount(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

function sumInstallments(installments: SaleDetails["installments"]): bigint {
  return installments.reduce(
    (total, installment) => total + installment.amountInCents,
    BigInt(0),
  );
}

function sumBasisPoints(rates: readonly number[]): number {
  return rates.reduce((total, rate) => total + rate, 0);
}

type SaleDetailsPageProps = {
  params: Promise<{ saleId: string }>;
};

export default async function SaleDetailsPage({
  params,
}: SaleDetailsPageProps) {
  await requirePageRole("admin");
  const { saleId } = await params;

  if (!isUuid(saleId)) {
    notFound();
  }

  const sale = await saleRepository.findById(saleId);

  if (!sale) {
    notFound();
  }

  // O total vem do percentual gravado na venda; a soma das parcelas é exibida ao
  // lado justamente para que qualquer divergência apareça na tela.
  const commissionInCents = calculateSellerCommissionTotal({
    creditAmountInCents: sale.creditAmountInCents,
    sellerRateBasisPoints: sale.sellerRateBasisPoints,
  });
  const installmentsInCents = sumInstallments(sale.installments);
  const quotaStatus = sale.quotaStatus;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Vendas", href: "/admin/sales" },
          { label: sale.code },
        ]}
        eyebrow="Venda"
        title={sale.code}
        subtitle={`${sale.customerName} · ${sale.product}`}
        actions={
          <ButtonLink href="/admin/sales" variant="secondary" icon={ArrowLeft}>
            Voltar para vendas
          </ButtonLink>
        }
      />

      <PageBody>
        <TwoColumn>
          <div className={styles.stack}>
            <Card aria-labelledby="sale-data-title">
              <CardHeading
                titleId="sale-data-title"
                kicker="Cadastro"
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
                    <StatusBadge tone={QUOTA_STATUS_TONES[quotaStatus]}>
                      {QUOTA_STATUS_LABELS[quotaStatus]}
                    </StatusBadge>
                  </dd>
                </div>
                <div>
                  <dt>Crédito</dt>
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
                  <dt>Vendedor</dt>
                  <dd>
                    <Link href={`/admin/sellers/${sale.sellerId}`}>
                      {sale.sellerName}
                    </Link>
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

            <Card flush aria-labelledby="sale-installments-title">
              <CardHeading
                titleId="sale-installments-title"
                kicker={
                  sale.installments.length > 0
                    ? `${formatInstallmentCount(sale.installments.length)} · ${formatCents(installmentsInCents)}`
                    : "Nenhuma parcela"
                }
                title="Parcelas previstas"
                description="Geradas no cadastro da venda e preservadas quando a régua muda."
              />

              {sale.installments.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Esta venda não tem parcelas geradas"
                  description="Ela foi registrada antes de a régua de parcelas existir, então não há régua nem parcelas para exibir. Vendas registradas depois disso têm as duas."
                />
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <th>Parcela</th>
                      <th>Competência</th>
                      <th>Previsão</th>
                      <th>Régua</th>
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
                          {formatBasisPoints(installment.ruleRateBasisPoints)}
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

          <Card aria-labelledby="sale-commission-title">
            <CardHeading
              titleId="sale-commission-title"
              kicker="Cálculo"
              title="Comissão da venda"
              description="Valores do momento do cadastro. Alterações posteriores no acordo ou na régua não recalculam esta venda."
            />

            <dl className={styles.snapshot}>
              <div>
                <dt>Comissão do vendedor</dt>
                <dd className="num">{formatCents(commissionInCents)}</dd>
              </div>
              <div>
                <dt>Percentual do vendedor</dt>
                <dd className="num">
                  {formatBasisPoints(sale.sellerRateBasisPoints)}
                  <span className={styles.origin}>
                    Vigência de{" "}
                    {formatBusinessDate(sale.sellerRateEffectiveFrom)}, no
                    histórico do{" "}
                    <Link href={`/admin/sellers/${sale.sellerId}`}>
                      vendedor
                    </Link>
                  </span>
                </dd>
              </div>

              {sale.installmentRatesBasisPoints &&
              sale.installmentRuleEffectiveFrom ? (
                <>
                  <div>
                    <dt>Régua da administradora</dt>
                    <dd className="num">
                      {formatBasisPoints(
                        sumBasisPoints(sale.installmentRatesBasisPoints),
                      )}
                      <span className={styles.origin}>
                        {sale.installmentRuleProduct}, vigência de{" "}
                        {formatBusinessDate(sale.installmentRuleEffectiveFrom)},
                        em{" "}
                        <Link href="/admin/installment-rules">
                          réguas de parcelas
                        </Link>
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Distribuição aplicada</dt>
                    <dd className={`num ${styles.distribution}`}>
                      {sale.installmentRatesBasisPoints
                        .map(formatBasisPoints)
                        .join(" · ")}
                    </dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>Régua da administradora</dt>
                  <dd>
                    <Alert tone="attention">
                      Venda registrada antes da régua de parcelas: nenhuma régua
                      foi gravada e nenhuma parcela foi gerada.
                    </Alert>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </TwoColumn>
      </PageBody>
    </>
  );
}
