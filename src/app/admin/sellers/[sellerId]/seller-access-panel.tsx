"use client";

import { KeyRound, Lock, LockOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import { readApiResult, readMessage } from "@/app/admin/_utils/api-result";
import styles from "./seller-details.module.css";

type SellerAccessPanelProps = {
  sellerId: string;
  email: string;
  access: { email: string; active: boolean } | null;
};

export function SellerAccessPanel({
  sellerId,
  email,
  access,
}: SellerAccessPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    request: () => Promise<Response>,
    onSuccess: (result: unknown) => void,
    failure: string,
  ) {
    event.preventDefault();
    setMessage(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await request();
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(readMessage(result, failure));
        return;
      }

      onSuccess(result);
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    return submit(
      event,
      () => fetch(`/api/admin/sellers/${sellerId}/access`, { method: "POST" }),
      (result) => {
        const password = (result as { temporaryPassword?: unknown })
          .temporaryPassword;

        setTemporaryPassword(typeof password === "string" ? password : null);
        setSuccess("Acesso criado com sucesso");
      },
      "Não foi possível criar o acesso do vendedor",
    );
  }

  function handleToggle(event: FormEvent<HTMLFormElement>) {
    const nextActive = !access?.active;

    return submit(
      event,
      () =>
        fetch(`/api/admin/sellers/${sellerId}/access/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active: nextActive }),
        }),
      () => {
        setTemporaryPassword(null);
        setSuccess(
          nextActive
            ? "Acesso liberado com sucesso"
            : "Acesso bloqueado com sucesso",
        );
      },
      "Não foi possível alterar o acesso do vendedor",
    );
  }

  const temporaryPasswordAlert = temporaryPassword ? (
    <Alert
      tone="attention"
      className={styles.statusFeedback}
      action={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setTemporaryPassword(null)}
        >
          Já copiei a senha
        </Button>
      }
    >
      Senha provisória: <strong>{temporaryPassword}</strong>. Ela não será
      exibida de novo depois que você confirmar. Repasse ao vendedor por um
      canal seguro.
    </Alert>
  ) : null;

  if (!access) {
    return (
      <Card tone="sunken">
        <form className={styles.statusPanel} onSubmit={handleCreate}>
          <div>
            <h3 className={styles.statusTitle}>Acesso do vendedor</h3>
            <p className={styles.statusText}>
              Este vendedor ainda não entra no sistema. O acesso usa o e-mail do
              cadastro, <strong>{email}</strong>, e uma senha provisória que
              aparece uma única vez, para você repassar a ele.
            </p>
          </div>

          <Button type="submit" icon={KeyRound} disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar acesso"}
          </Button>

          {temporaryPasswordAlert}
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

  return (
    <Card tone="sunken">
      <form className={styles.statusPanel} onSubmit={handleToggle}>
        <div>
          <h3 className={styles.statusTitle}>
            Acesso do vendedor{" "}
            <StatusBadge tone={access.active ? "received" : "cancelled"}>
              {access.active ? "Liberado" : "Bloqueado"}
            </StatusBadge>
          </h3>
          <p className={styles.statusText}>
            {access.active
              ? `Entra no sistema com ${access.email}. Bloquear encerra as sessões abertas e impede novos acessos, sem apagar vendas nem histórico.`
              : `O acesso com ${access.email} está bloqueado. As vendas e o histórico continuam preservados.`}
          </p>
        </div>

        <Button
          type="submit"
          variant={access.active ? "danger" : "primary"}
          icon={access.active ? Lock : LockOpen}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Alterando..."
            : access.active
              ? "Bloquear acesso"
              : "Liberar acesso"}
        </Button>

        {temporaryPasswordAlert}
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
