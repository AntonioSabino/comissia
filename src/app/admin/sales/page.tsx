import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/app/_components/ui/alert";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { getBusinessDate } from "@/lib/business-date";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { listActiveAdministrators } from "@/modules/sales/application/list-active-administrators";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";
import { listActiveSellersForSale } from "@/modules/sellers/application/list-active-sellers-for-sale";
import { sellerRepository } from "@/modules/sellers/infrastructure/db/seller-repository";
import { SaleForm } from "./sale-form";

export const metadata: Metadata = {
  title: "Vendas | Comissia",
};

export default async function SalesPage() {
  await requirePageRole("admin");
  const [sellerList, administratorList] = await Promise.all([
    listActiveSellersForSale({ repository: sellerRepository }),
    listActiveAdministrators({ repository: administratorRepository }),
  ]);
  const canRegister = sellerList.length > 0 && administratorList.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Vendas efetuadas"
        title="Vendas"
        subtitle="Registre as vendas de consórcio concluídas."
      />

      <PageBody>
        <Card aria-labelledby="new-sale-title">
          <CardHeading
            titleId="new-sale-title"
            kicker="Nova venda"
            title="Cadastrar venda"
            description="O código da venda é gerado pelo sistema. Somente vendedores e administradoras ativos aparecem na lista."
          />

          {canRegister ? (
            <SaleForm
              administrators={administratorList.map(({ id, name }) => ({
                id,
                name,
              }))}
              sellers={sellerList.map(({ id, name }) => ({ id, name }))}
              today={getBusinessDate()}
            />
          ) : (
            <Alert tone="attention">
              Para registrar vendas, cadastre ao menos um{" "}
              <Link href="/admin/sellers">vendedor ativo</Link> e uma{" "}
              <Link href="/admin/administrators">administradora ativa</Link>.
            </Alert>
          )}
        </Card>
      </PageBody>
    </>
  );
}
