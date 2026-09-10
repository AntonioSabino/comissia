import { SearchX } from "lucide-react";
import { ButtonLink } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import { PageBody } from "@/app/_components/ui/page-layout";
import { EmptyState } from "@/app/_components/ui/state-block";

export default function AdminNotFound() {
  return (
    <PageBody>
      <Card flush>
        <EmptyState
          icon={SearchX}
          title="Registro não encontrado"
          description="O endereço pode estar incompleto ou o registro não existe mais."
          action={
            <ButtonLink href="/admin" variant="secondary">
              Voltar para a visão geral
            </ButtonLink>
          }
        />
      </Card>
    </PageBody>
  );
}
