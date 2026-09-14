import { CalendarClock, Filter, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button, ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable, DataToolbar } from "@/app/_components/ui/data-table";
import { Input, Select } from "@/app/_components/ui/field";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
} from "@/app/_utils/installment-status";
import {
  formatBusinessDate,
  formatCents,
  formatCompetence,
} from "@/app/_utils/format";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { COMMISSION_INSTALLMENT_STATUSES } from "@/modules/commissions";
import {
  hasCommissionInstallmentListFilters,
  parseCommissionInstallmentListFilters,
  type CommissionInstallmentListSearchParams,
} from "@/modules/sales/application/commission-installment-list-filters";
import { sumInstallmentAmounts } from "@/modules/sales/application/installment-totals";
import { adminCommissionRepository } from "@/modules/sales/infrastructure/db/admin-commission-repository";
import { listSellerOptions } from "@/modules/sellers/server";
import styles from "./commissions.module.css";

export const metadata: Metadata = {
  title: "Parcelas de comissão | Comissia",
};

type AdminCommissionsPageProps = {
  searchParams: Promise<CommissionInstallmentListSearchParams>;
};

export default async function AdminCommissionsPage({
  searchParams,
}: AdminCommissionsPageProps) {
  await requirePageRole("admin");
  const filters = parseCommissionInstallmentListFilters(await searchParams);
  const [sellerList, installments] = await Promise.all([
    listSellerOptions(),
    adminCommissionRepository.listInstallments(filters),
  ]);
  const isFiltered = hasCommissionInstallmentListFilters(filters);
  const totalInCents = sumInstallmentAmounts(installments);

  return (
    <>
      <PageHeader
        eyebrow="Comissões"
        title="Parcelas de comissão"
        subtitle="Consulte os valores previstos por competência, vendedor e situação."
      />

      <PageBody>
        <Card flush aria-labelledby="commission-installments-title">
          <CardHeading
            titleId="commission-installments-title"
            kicker="Consulta administrativa"
            title="Parcelas geradas"
            description="Os valores foram preservados no cadastro de cada venda. Tributação e conciliação ficam fora deste incremento."
          />

          <DataToolbar>
            <form className={styles.filters} method="get" role="search">
              <Input
                className={styles.competence}
                type="month"
                name="from"
                defaultValue={filters.from}
                aria-label="Competência inicial"
              />
              <Input
                className={styles.competence}
                type="month"
                name="to"
                defaultValue={filters.to}
                aria-label="Competência final"
              />
              <Select
                className={styles.choice}
                name="seller"
                defaultValue={filters.seller}
                aria-label="Vendedor"
              >
                <option value="">Todos os vendedores</option>
                {sellerList.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </Select>
              <Select
                className={styles.choice}
                name="status"
                defaultValue={filters.status}
                aria-label="Situação da parcela"
              >
                <option value="all">Todas as situações</option>
                {COMMISSION_INSTALLMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {INSTALLMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="secondary" size="sm" icon={Filter}>
                Filtrar
              </Button>
              {isFiltered ? (
                <Link href="/admin/commissions">Limpar</Link>
              ) : null}
            </form>
          </DataToolbar>

          <div className={styles.totals} aria-label="Totais do resultado">
            <div>
              <span>Parcelas encontradas</span>
              <strong className="num">{installments.length}</strong>
            </div>
            <div>
              <span>Valor previsto</span>
              <strong className="num">{formatCents(totalInCents)}</strong>
            </div>
          </div>

          {installments.length === 0 ? (
            isFiltered ? (
              <EmptyState
                icon={SearchX}
                title="Nenhuma parcela encontrada"
                description="Revise o período, o vendedor ou a situação selecionada."
                action={
                  <ButtonLink href="/admin/commissions" variant="secondary">
                    Limpar filtros
                  </ButtonLink>
                }
              />
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Nenhuma parcela gerada"
                description="As parcelas aparecerão aqui quando uma venda com régua vigente for cadastrada."
              />
            )
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Venda</th>
                  <th>Vendedor</th>
                  <th>Parcela</th>
                  <th>Competência</th>
                  <th>Previsão</th>
                  <th>Valor previsto</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((installment) => (
                  <tr key={installment.id}>
                    <td className="num">
                      <Link href={`/admin/sales/${installment.saleId}`}>
                        {installment.saleCode}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/sellers/${installment.sellerId}`}>
                        {installment.sellerName}
                      </Link>
                    </td>
                    <td className="num">
                      {installment.number}/{installment.saleInstallments}
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
      </PageBody>
    </>
  );
}
