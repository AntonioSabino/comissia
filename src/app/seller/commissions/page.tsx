import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import {
  StatusBadge,
  type StatusTone,
} from "@/app/_components/ui/status-badge";
import {
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import type { CommissionInstallmentStatus } from "@/modules/commissions";
import {
  groupInstallmentsByCompetence,
  selectCompetence,
} from "@/modules/sales/application/monthly-commission-forecast";
import { sellerCommissionRepository } from "@/modules/sales/infrastructure/db/seller-commission-repository";
import styles from "./commissions.module.css";

export const metadata: Metadata = {
  title: "Previsão mensal | Comissia",
};

const STATUS_LABELS: Record<CommissionInstallmentStatus, string> = {
  prevista: "Prevista",
  programada: "Programada",
  paga: "Paga",
  cancelada: "Cancelada",
  ajustada: "Ajustada",
};

const STATUS_TONES: Record<CommissionInstallmentStatus, StatusTone> = {
  prevista: "pending",
  programada: "reconciled",
  paga: "received",
  cancelada: "cancelled",
  ajustada: "neutral",
};

function formatInstallmentCount(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

type SellerCommissionsPageProps = {
  searchParams: Promise<{ competencia?: string | string[] }>;
};

export default async function SellerCommissionsPage({
  searchParams,
}: SellerCommissionsPageProps) {
  const user = await requirePageRole("seller");
  const { competencia } = await searchParams;
  const requested = Array.isArray(competencia) ? competencia[0] : competencia;

  const header = (
    <PageHeader
      eyebrow="Área do vendedor"
      title="Previsão mensal"
      subtitle="Quanto você tem previsto para receber em cada mês."
    />
  );

  if (!user.sellerId) {
    return (
      <>
        {header}
        <PageBody>
          <Card flush>
            <ErrorState
              title="Sua conta ainda não está ligada a um cadastro de vendedor"
              description="Peça à administração para vincular o seu acesso ao seu cadastro; sem isso não há comissões para mostrar."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  const today = getBusinessDate();
  const months = groupInstallmentsByCompetence(
    await sellerCommissionRepository.listInstallments(user.sellerId),
  );
  const selected = selectCompetence(months, requested, today);
  const currentIndex = months.findIndex(
    (month) => month.competence === selected,
  );
  const month = currentIndex >= 0 ? months[currentIndex] : null;
  const previous = currentIndex > 0 ? months[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < months.length - 1
      ? months[currentIndex + 1]
      : null;

  if (!month) {
    return (
      <>
        {header}
        <PageBody>
          <Card flush>
            <EmptyState
              icon={Wallet}
              title="Você ainda não tem parcelas previstas"
              description="Assim que a administração registrar uma venda sua, as parcelas e os valores previstos aparecem aqui, mês a mês."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      {header}

      <PageBody>
        <TwoColumn>
          <div className={styles.stack}>
            <Card aria-labelledby="month-total-title">
              <CardHeading
                titleId="month-total-title"
                kicker={`Competência ${formatCompetence(month.competence)}`}
                title="Previsto para o mês"
                action={
                  <div className={styles.navigation}>
                    {previous ? (
                      <ButtonLink
                        href={`/seller/commissions?competencia=${previous.competence}`}
                        variant="secondary"
                        size="sm"
                        icon={ChevronLeft}
                      >
                        {formatCompetence(previous.competence)}
                      </ButtonLink>
                    ) : null}
                    {next ? (
                      <ButtonLink
                        href={`/seller/commissions?competencia=${next.competence}`}
                        variant="secondary"
                        size="sm"
                        iconAfter={ChevronRight}
                      >
                        {formatCompetence(next.competence)}
                      </ButtonLink>
                    ) : null}
                  </div>
                }
              />

              <p className={`num ${styles.total}`}>
                {formatCents(month.totalInCents)}
              </p>
              <p className={styles.totalNote}>
                {formatInstallmentCount(month.installments.length)} nesta
                competência.
              </p>

              <Alert>
                Estes valores são previsões de comissão, calculadas quando cada
                venda foi registrada. Nenhum deles representa pagamento já
                efetuado.
              </Alert>
            </Card>

            <Card flush aria-labelledby="month-installments-title">
              <CardHeading
                titleId="month-installments-title"
                kicker={formatInstallmentCount(month.installments.length)}
                title={`Parcelas de ${formatCompetence(month.competence)}`}
                description="Cada linha mostra de qual venda o valor vem."
              />

              <DataTable>
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Previsão</th>
                    <th>Venda</th>
                    <th>Produto</th>
                    <th>Administradora</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {month.installments.map((installment) => (
                    <tr key={installment.id}>
                      <td className="num">
                        {installment.number}/{installment.saleInstallments}
                      </td>
                      <td className="num">
                        {formatBusinessDate(installment.dueOn)}
                      </td>
                      <td className="num">{installment.saleCode}</td>
                      <td>{installment.product}</td>
                      <td>{installment.administratorName}</td>
                      <td>{installment.customerName}</td>
                      <td className="num">
                        {formatCents(installment.amountInCents)}
                      </td>
                      <td>
                        <StatusBadge tone={STATUS_TONES[installment.status]}>
                          {STATUS_LABELS[installment.status]}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Card>
          </div>

          <Card flush aria-labelledby="months-title">
            <CardHeading
              titleId="months-title"
              kicker={
                months.length === 1
                  ? "1 competência"
                  : `${months.length} competências`
              }
              title="Todos os meses"
            />

            <DataTable>
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Parcelas</th>
                  <th>Previsto</th>
                </tr>
              </thead>
              <tbody>
                {months.map((item) => (
                  <tr
                    key={item.competence}
                    aria-current={
                      item.competence === month.competence ? "true" : undefined
                    }
                    className={
                      item.competence === month.competence
                        ? styles.selected
                        : undefined
                    }
                  >
                    <td className="num">
                      <Link
                        href={`/seller/commissions?competencia=${item.competence}`}
                      >
                        {formatCompetence(item.competence)}
                      </Link>
                    </td>
                    <td className="num">{item.installments.length}</td>
                    <td className="num">{formatCents(item.totalInCents)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </Card>
        </TwoColumn>
      </PageBody>
    </>
  );
}
