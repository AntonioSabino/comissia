import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable } from "@/app/_components/ui/data-table";
import { PageBody, PageHeader } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import { requirePageRole } from "@/modules/auth/infrastructure/next/current-user";
import { administratorRepository } from "@/modules/sales/infrastructure/db/administrator-repository";
import { AdministratorForm } from "./administrator-form";
import { AdministratorStatusButton } from "./administrator-status-button";

export const metadata: Metadata = {
  title: "Administradoras | Comissia",
};

function formatAdministratorCount(count: number): string {
  return count === 1 ? "1 administradora" : `${count} administradoras`;
}

export default async function AdministratorsPage() {
  await requirePageRole("admin");
  const administratorList = await administratorRepository.list();

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Administradoras"
        subtitle="Cadastre as administradoras de consórcio que aparecem nas vendas."
      />

      <PageBody>
        <Card aria-labelledby="new-administrator-title">
          <CardHeading
            titleId="new-administrator-title"
            kicker="Novo cadastro"
            title="Nova administradora"
            description="O nome é único e não diferencia maiúsculas de minúsculas."
          />
          <AdministratorForm />
        </Card>

        <Card flush aria-labelledby="administrators-title">
          <CardHeading
            titleId="administrators-title"
            kicker={formatAdministratorCount(administratorList.length)}
            title="Administradoras cadastradas"
          />

          {administratorList.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma administradora cadastrada"
              description="Use o formulário acima para cadastrar a primeira administradora."
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Situação</th>
                  <th>
                    <span className="visually-hidden">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {administratorList.map((administrator) => (
                  <tr key={administrator.id}>
                    <td>{administrator.name}</td>
                    <td>
                      <StatusBadge
                        tone={administrator.active ? "received" : "neutral"}
                      >
                        {administrator.active ? "Ativa" : "Inativa"}
                      </StatusBadge>
                    </td>
                    <td>
                      <AdministratorStatusButton
                        administratorId={administrator.id}
                        name={administrator.name}
                        active={administrator.active}
                      />
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
