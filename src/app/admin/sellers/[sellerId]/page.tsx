import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { isSellerId } from "@/modules/sellers/domain/seller-id";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";
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
  const currentRateId = seller.commissionRates.find(
    (rate) => rate.effectiveFrom <= today,
  )?.id;

  return (
    <main className="admin-shell">
      <div className="admin-content">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Vendedor</p>
            <h1>{seller.name}</h1>
            <p className="subtitle">
              Dados cadastrais e histórico de percentuais de comissão.
            </p>
          </div>
          <Link href="/admin/sellers">Voltar para vendedores</Link>
        </header>

        <section className="admin-card">
          <div className="section-heading">
            <h2>Dados cadastrais</h2>
            <span
              className={
                seller.active
                  ? "status-badge status-active"
                  : "status-badge status-inactive"
              }
            >
              {seller.active ? "Ativo" : "Inativo"}
            </span>
          </div>

          <SellerProfileForm
            sellerId={seller.id}
            name={seller.name}
            document={formatDocument(seller.document)}
            email={seller.email}
            phone={formatPhone(seller.phone)}
          />

          <SellerStatusForm sellerId={seller.id} active={seller.active} />
        </section>

        <section className="admin-card">
          <h2>Percentual de comissão</h2>
          <p className="card-hint">
            Um novo acordo entra como uma nova vigência. As vendas já
            registradas mantêm o percentual aplicado na data.
          </p>

          <dl className="seller-details-grid">
            <div>
              <dt>Percentual vigente</dt>
              <dd>
                {seller.rateBasisPoints === null
                  ? "Não informado"
                  : formatRate(seller.rateBasisPoints)}
              </dd>
            </div>
            <div>
              <dt>Início da vigência atual</dt>
              <dd>
                {seller.effectiveFrom === null
                  ? "Não informado"
                  : formatDate(seller.effectiveFrom)}
              </dd>
            </div>
          </dl>

          <SellerRateForm sellerId={seller.id} defaultEffectiveFrom={today} />
        </section>

        <section className="admin-card">
          <div className="section-heading">
            <h2>Histórico de percentuais</h2>
            <span>{seller.commissionRates.length}</span>
          </div>

          {seller.commissionRates.length === 0 ? (
            <p className="empty-state">Nenhuma regra de comissão cadastrada.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Percentual</th>
                    <th>Início da vigência</th>
                    <th>Condição</th>
                  </tr>
                </thead>
                <tbody>
                  {seller.commissionRates.map((rate) => (
                    <tr key={rate.id}>
                      <td>{formatRate(rate.rateBasisPoints)}</td>
                      <td>{formatDate(rate.effectiveFrom)}</td>
                      <td>
                        {rate.id === currentRateId
                          ? "Vigente"
                          : rate.effectiveFrom > today
                            ? "Futura"
                            : "Encerrada"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
