import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";

export const metadata: Metadata = {
  title: "Visão geral | Comissia",
};

export default async function AdminPage() {
  await requirePageRole("admin");

  return (
    <>
      <PageHeader
        eyebrow="Área administrativa"
        title="Visão geral"
        subtitle="Acesso confirmado aos módulos administrativos da Comissia."
      />

      <PageBody>
        <Card>
          <CardHeading
            kicker="Cadastros"
            title="Vendedores"
            description="Cadastre vendedores, acompanhe a situação de cada um e mantenha o histórico de percentuais de comissão."
            action={
              <ButtonLink
                href="/admin/sellers"
                variant="secondary"
                iconAfter={ArrowRight}
              >
                Gerenciar vendedores
              </ButtonLink>
            }
          />
        </Card>
      </PageBody>
    </>
  );
}
