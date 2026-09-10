import { History } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/app/_components/ui/alert";
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
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { findRateValidOn } from "@/modules/sellers/domain/commission-rate-on-date";
import { isSellerId } from "@/modules/sellers/domain/seller-id";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";
import styles from "./seller-details.module.css";
import { SellerProfileForm } from "./seller-profile-form";
import { SellerRateForm } from "./seller-rate-form";
import { SellerStatusForm } from "./seller-status-form";

export const metadata: Metadata = {
  title: "Detalhes do vendedor | Comissia",
};

function formatDocument(document: string): string {
  return document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

function formatPhone(phone: string | null): string {
  if (!phone) {
    return "";
  }

  if (phone.length === 11) {
    return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (phone.length === 10) {
    return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return phone;
}

function formatRate(basisPoints: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(basisPoints / 10_000);
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function formatRateCount(count: number): string {
  return count === 1 ? "1 vigência" : `${count} vigências`;
}

function describeRate(
  rate: { id: string; effectiveFrom: string },
  currentRateId: string | undefined,
  today: string,
): { label: string; tone: StatusTone } {
  if (rate.id === currentRateId) {
    return { label: "Vigente", tone: "received" };
  }

  if (rate.effectiveFrom > today) {
    return { label: "Futura", tone: "pending" };
  }

  return { label: "Encerrada", tone: "neutral" };
}

type SellerDetailsPageProps = {
  params: Promise<{ sellerId: string }>;
};

export default async function SellerDetailsPage({
  params,
}: SellerDetailsPageProps) {
  await requirePageRole("admin");
  const { sellerId } = await params;

  if (!isSellerId(sellerId)) {
    notFound();
  }

  const seller = await sellerRepository.findById(sellerId);

  if (!seller) {
    notFound();
  }

  const today = getBusinessDate();
  const currentRateId = findRateValidOn(seller.commissionRates, today)?.id;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Vendedores", href: "/admin/sellers" },
          { label: seller.name },
        ]}
        eyebrow="Vendedor"
        title={seller.name}
        subtitle="Dados cadastrais e histórico de percentuais de comissão."
        actions={
          <StatusBadge tone={seller.active ? "received" : "neutral"}>
            {seller.active ? "Ativo" : "Inativo"}
          </StatusBadge>
        }
      />

      <PageBody>
        <TwoColumn>
          <Card aria-labelledby="profile-title">
            <CardHeading
              titleId="profile-title"
              kicker="Cadastro"
              title="Dados cadastrais"
            />
            <div className={styles.stack}>
              <SellerProfileForm
                sellerId={seller.id}
                name={seller.name}
                document={formatDocument(seller.document)}
                email={seller.email}
                phone={formatPhone(seller.phone)}
              />
              <SellerStatusForm sellerId={seller.id} active={seller.active} />
            </div>
          </Card>

          <Card aria-labelledby="rate-title">
            <CardHeading
              titleId="rate-title"
              kicker="Comissão"
              title="Percentual de comissão"
            />
            <div className={styles.stack}>
              <Alert>
                Um novo acordo entra como uma nova vigência. As vendas já
                registradas mantêm o percentual aplicado na data.
              </Alert>

              <dl className={styles.summary}>
                <div>
                  <dt>Percentual vigente</dt>
                  <dd className="num">
                    {seller.rateBasisPoints === null
                      ? "Não informado"
                      : formatRate(seller.rateBasisPoints)}
                  </dd>
                </div>
                <div>
                  <dt>Início da vigência atual</dt>
                  <dd className="num">
                    {seller.effectiveFrom === null
                      ? "Não informado"
                      : formatDate(seller.effectiveFrom)}
                  </dd>
                </div>
              </dl>

              <SellerRateForm
                sellerId={seller.id}
                defaultEffectiveFrom={today}
              />
            </div>
          </Card>
        </TwoColumn>

        <Card flush aria-labelledby="rates-title">
          <CardHeading
            titleId="rates-title"
            kicker={formatRateCount(seller.commissionRates.length)}
            title="Histórico de percentuais"
          />

          {seller.commissionRates.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhuma regra de comissão cadastrada"
              description="Registre a primeira vigência no formulário de percentual de comissão."
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Percentual</th>
                  <th>Início da vigência</th>
                  <th>Condição</th>
                </tr>
              </thead>
              <tbody>
                {seller.commissionRates.map((rate) => {
                  const condition = describeRate(rate, currentRateId, today);

                  return (
                    <tr key={rate.id}>
                      <td className="num">
                        {formatRate(rate.rateBasisPoints)}
                      </td>
                      <td className="num">{formatDate(rate.effectiveFrom)}</td>
                      <td>
                        <StatusBadge tone={condition.tone}>
                          {condition.label}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </Card>
      </PageBody>
    </>
  );
}
