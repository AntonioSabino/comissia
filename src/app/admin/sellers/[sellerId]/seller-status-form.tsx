"use client";

import { UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import { readApiResult, readMessage } from "@/app/admin/_utils/api-result";
import styles from "./seller-details.module.css";

type SellerStatusFormProps = {
  sellerId: string;
  active: boolean;
};

export function SellerStatusForm({ sellerId, active }: SellerStatusFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextActive = !active;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/sellers/${sellerId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(
          readMessage(
            result,
            "Não foi possível alterar a situação do vendedor",
          ),
        );
        return;
      }

      setSuccess(
        nextActive
          ? "Vendedor reativado com sucesso"
          : "Vendedor inativado com sucesso",
      );
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card tone="sunken">
      <form className={styles.statusPanel} onSubmit={handleSubmit}>
        <div>
          <h3 className={styles.statusTitle}>
            {active ? "Inativar vendedor" : "Reativar vendedor"}
          </h3>
          <p className={styles.statusText}>
            {active
              ? "O vendedor continuará consultável, mas não ficará disponível para novas vendas."
              : "O vendedor voltará a ficar disponível para novas vendas."}
          </p>
        </div>

        <Button
          type="submit"
          variant={active ? "danger" : "primary"}
          icon={active ? UserX : UserCheck}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Alterando..."
            : active
              ? "Inativar vendedor"
              : "Reativar vendedor"}
        </Button>

        {message ? (
          <Alert tone="critical" className={styles.statusFeedback}>
            {message}
          </Alert>
        ) : null}
        {success ? (
          <Alert tone="positive" className={styles.statusFeedback}>
            {success}
          </Alert>
        ) : null}
      </form>
    </Card>
  );
}
