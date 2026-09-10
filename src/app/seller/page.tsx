import { Percent } from "lucide-react";
import type { Metadata } from "next";
import { Card } from "@/app/_components/ui/card";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";

export const metadata: Metadata = {
  title: "Área do vendedor | Comissia",
};

export default async function SellerPage() {
  await requirePageRole("seller");

  return (
    <>
      <PageHeader
        eyebrow="Área do vendedor"
        title="Resumo"
        subtitle="Você vê somente seus acordos e valores."
      />

      <PageBody>
        <Card flush>
          <EmptyState
            icon={Percent}
            title="Suas comissões aparecerão aqui"
            description="Quando a administração registrar suas vendas, os valores previstos e as parcelas ficam disponíveis nesta área."
          />
        </Card>
      </PageBody>
    </>
  );
}
