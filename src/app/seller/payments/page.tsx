import { Download, WalletCards } from "lucide-react";
import type { Metadata } from "next";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable, DataToolbar } from "@/app/_components/ui/data-table";
import { Select } from "@/app/_components/ui/field";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState, ErrorState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import {
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import {
  PAYOUT_STAGE_LABELS,
  PAYOUT_STAGE_TONES,
} from "@/app/_utils/payout-stage";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { buildSellerPaymentHistory } from "@/modules/sales/application/seller-payment-history";
import { commissionStatementRepository } from "@/modules/sales/infrastructure/db/commission-statement-repository";
import styles from "./payments.module.css";

export const metadata: Metadata = {
  title: "Pagamentos | Comissia",
};

function installmentsLabel(count: number): string {
  return count === 1 ? "1 parcela" : `${count} parcelas`;
}

export default async function SellerPaymentsPage() {
  const user = await requirePageRole("seller");

  const header = (
    <PageHeader
      eyebrow="Histórico do vendedor"
      title="Pagamentos"
      subtitle="Fechamentos mensais e pagamentos registrados pela administração."
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
              description="Peça à administração para vincular o seu acesso ao seu cadastro; sem isso não há pagamentos para mostrar."
            />
          </Card>
        </PageBody>
      </>
    );
  }

  const today = getBusinessDate();
  // O vendedor vem da sessão: esta tela nunca aceita outro pela URL.
  const history = buildSellerPaymentHistory(
    await commissionStatementRepository.listInstallments({
      sellerId: user.sellerId,
    }),
    today,
    (instant) => getBusinessDate(new Date(instant)),
  );
  const { lastPayment, nextPayment } = history;

  return (
    <>
      {header}

      <PageBody>
        <dl className={styles.summary} aria-label="Resumo dos pagamentos">
          <div>
            <dt>Pago no ano</dt>
            <dd className={`${styles.value} num`}>
              {formatCents(history.paidThisYearInCents)}
            </dd>
            <dd className={styles.note}>Competências de {today.slice(0, 4)}</dd>
          </div>
          <div>
            <dt>Último pagamento</dt>
            <dd className={`${styles.value} num`}>
              {lastPayment ? formatCents(lastPayment.paidInCents) : "—"}
            </dd>
            <dd className={styles.note}>
              {lastPayment?.paidOn
                ? `Registrado em ${formatBusinessDate(lastPayment.paidOn)}`
                : "Nenhum pagamento registrado"}
            </dd>
          </div>
          <div>
            <dt>Próximo pagamento</dt>
            <dd className={`${styles.value} num`}>
              {nextPayment ? formatCents(nextPayment.toPayInCents) : "—"}
            </dd>
            <dd className={styles.note}>
              {nextPayment
                ? `${PAYOUT_STAGE_LABELS[nextPayment.stage]} · ${formatCompetence(nextPayment.competence)}`
                : "Nada pendente"}
            </dd>
          </div>
          <div>
            <dt>Fora do fechamento</dt>
            <dd className={`${styles.value} num`}>
              {history.outsideInstallments}
            </dd>
            <dd className={styles.note}>
              {history.outsideInstallments === 0
                ? "Nenhuma parcela cancelada ou ajustada"
                : "Parcelas canceladas ou ajustadas"}
            </dd>
          </div>
        </dl>

        <Card flush aria-labelledby="seller-payments-title">
          <CardHeading
            titleId="seller-payments-title"
            kicker="Histórico e agenda"
            title="Pagamentos mensais"
          />

          {history.months.length === 0 ? (
            <EmptyState
              icon={WalletCards}
              title="Nenhum pagamento por enquanto"
              description="Quando a administração fechar um mês com parcelas suas, ele aparece aqui."
            />
          ) : (
            <>
              <DataToolbar>
                <form
                  className={styles.statementForm}
                  action="/seller/payments/statement"
                  method="get"
                >
                  <Select
                    className={styles.statementSelect}
                    name="competencia"
                    defaultValue={history.months[0].competence}
                    aria-label="Competência do demonstrativo"
                  >
                    {history.months.map((month) => (
                      <option key={month.competence} value={month.competence}>
                        {formatCompetence(month.competence)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    icon={Download}
                  >
                    Baixar demonstrativo
                  </Button>
                </form>
              </DataToolbar>

              <DataTable>
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Pagamento</th>
                    <th>Composição</th>
                    <th>Valor</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {history.months.map((month) => (
                    <tr key={month.competence}>
                      <td className="num">
                        {formatCompetence(month.competence)}
                      </td>
                      <td className="num">
                        {month.paidOn ? formatBusinessDate(month.paidOn) : "—"}
                      </td>
                      <td>{installmentsLabel(month.closingInstallments)}</td>
                      <td className="num">
                        {formatCents(month.amountInCents)}
                      </td>
                      <td>
                        <StatusBadge tone={PAYOUT_STAGE_TONES[month.stage]}>
                          {PAYOUT_STAGE_LABELS[month.stage]}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </>
          )}
        </Card>

        <Alert>
          O demonstrativo detalha cada parcela que compõe o pagamento do mês,
          com a venda, o cliente, o grupo e a cota.
        </Alert>
      </PageBody>
    </>
  );
}
