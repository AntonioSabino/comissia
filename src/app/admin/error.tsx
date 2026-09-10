"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import { PageBody } from "@/app/_components/ui/page-layout";
import { ErrorState } from "@/app/_components/ui/state-block";

type AdminErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function AdminError({ error, retry }: AdminErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageBody>
      <Card flush>
        <ErrorState
          title="Não foi possível carregar esta página"
          description={
            error.digest
              ? `Tente novamente. Se o problema continuar, informe ao suporte o código ${error.digest}.`
              : "Tente novamente em instantes."
          }
          action={
            <Button
              variant="secondary"
              icon={RotateCcw}
              onClick={() => retry()}
            >
              Tentar novamente
            </Button>
          }
        />
      </Card>
    </PageBody>
  );
}
