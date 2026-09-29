import { ArrowLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/app/_components/shell/brand-mark";
import { DataTable } from "@/app/_components/ui/data-table";
import { EmptyState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import {
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
} from "@/app/_utils/installment-status";
import type { StatementInstallment } from "@/modules/sales/application/commission-statement-repository";
import type { PayoutClosing } from "@/modules/sales/application/payout-closing";
import styles from "./commission-statement.module.css";
import { PrintButton } from "./print-button";

type CommissionStatementProps = {
  /** Rótulo acima do título, como "Demonstrativo de comissões". */
  kicker: string;
  title: string;
  /** Competência no formato AAAA-MM. */
  competence: string;
  /** Data de negócio da emissão (AAAA-MM-DD). */
  issuedOn: string;
  closing: PayoutClosing<StatementInstallment>;
  /** Na conferência, cada vendedor ganha um título e o seu subtotal. */
  groupBySeller?: boolean;
  back: { href: string; label: string };
};

/**
 * Documento do demonstrativo, pensado para a tela e para a impressão. Os
 * totais vêm do mesmo `buildPayoutClosing` da tela de repasses, então o que o
 * vendedor leva impresso é exatamente o que a administração conferiu.
 */
export function CommissionStatement({
  kicker,
  title,
  competence,
  issuedOn,
  closing,
  groupBySeller = false,
  back,
}: CommissionStatementProps) {
  const label = formatCompetence(competence);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link className={styles.back} href={back.href}>
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
        <PrintButton />
      </div>

      <article className={styles.document} aria-labelledby="statement-title">
        <header className={styles.header}>
          <div className={styles.brand}>
            <BrandMark size="sm" />
            <span>
              <strong>Comissia</strong>
              <small>Gestão de comissões</small>
            </span>
          </div>

          <div className={styles.heading}>
            <p className={styles.kicker}>{kicker}</p>
            <h1 id="statement-title" className={styles.title}>
              {title}
            </h1>
          </div>

          <dl className={styles.meta}>
            <div>
              <dt>Competência</dt>
              <dd className="num">{label}</dd>
            </div>
            <div>
              <dt>Emitido em</dt>
              <dd className="num">{formatBusinessDate(issuedOn)}</dd>
            </div>
          </dl>
        </header>

        <dl className={styles.totals} aria-label="Totais do fechamento">
          <div>
            <dt>Total do fechamento</dt>
            <dd className="num">{formatCents(closing.totalInCents)}</dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd className="num">{formatCents(closing.paidInCents)}</dd>
          </div>
          <div>
            <dt>A pagar</dt>
            <dd className="num">{formatCents(closing.toPayInCents)}</dd>
          </div>
          <div>
            <dt>Fora do fechamento</dt>
            <dd className="num">{formatCents(closing.outsideInCents)}</dd>
          </div>
        </dl>

        {closing.sellers.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={`Nenhuma parcela em ${label}`}
            description="Não há comissão a demonstrar nesta competência."
          />
        ) : (
          closing.sellers.map((seller) => (
            <section
              key={seller.sellerId}
              className={styles.section}
              aria-label={
                groupBySeller ? undefined : `Parcelas de ${seller.sellerName}`
              }
              aria-labelledby={
                groupBySeller
                  ? `statement-seller-${seller.sellerId}`
                  : undefined
              }
            >
              {groupBySeller ? (
                <h2
                  id={`statement-seller-${seller.sellerId}`}
                  className={styles.sellerTitle}
                >
                  {seller.sellerName}
                  <span className="num">
                    {formatCents(seller.totalInCents)}
                  </span>
                </h2>
              ) : null}

              <DataTable className={styles.table}>
                <thead>
                  <tr>
                    <th>Venda</th>
                    <th>Cliente</th>
                    <th>Administradora · produto</th>
                    <th>Grupo/cota</th>
                    <th>Parcela</th>
                    <th>Previsão</th>
                    <th>Valor</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {seller.installments.map((installment) => (
                    <tr key={installment.id}>
                      <td className="num">{installment.saleCode}</td>
                      <td>{installment.customerName}</td>
                      <td>
                        {installment.administratorName} · {installment.product}
                      </td>
                      <td className="num">
                        {installment.groupCode}/{installment.quotaCode}
                      </td>
                      <td className="num">
                        {installment.number}/{installment.saleInstallments}
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
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={6}>
                      {groupBySeller
                        ? `Subtotal de ${seller.sellerName}`
                        : "Total do fechamento"}
                    </th>
                    <td className="num">{formatCents(seller.totalInCents)}</td>
                    <td />
                  </tr>
                </tfoot>
              </DataTable>
            </section>
          ))
        )}

        <footer className={styles.footnote}>
          <p>
            Canceladas e ajustadas aparecem para conferência, mas não entram no
            total do fechamento. Valores em reais, calculados sobre o crédito
            vendido e o percentual acordado com o vendedor na data da venda.
          </p>
        </footer>
      </article>
    </div>
  );
}
