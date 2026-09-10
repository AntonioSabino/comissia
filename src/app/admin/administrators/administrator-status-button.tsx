"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { readApiResult, readMessage } from "@/app/admin/_utils/api-result";
import styles from "./administrators.module.css";

type AdministratorStatusButtonProps = {
  administratorId: string;
  name: string;
  active: boolean;
};

export function AdministratorStatusButton({
  administratorId,
  name,
  active,
}: AdministratorStatusButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const action = active ? "Inativar" : "Reativar";

  async function handleClick() {
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/administrators/${administratorId}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active: !active }),
        },
      );

      if (!response.ok) {
        setMessage(
          readMessage(
            await readApiResult(response),
            "Não foi possível alterar a situação",
          ),
        );
        return;
      }

      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.statusAction}>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleClick}
        disabled={isSubmitting}
        aria-label={`${action} ${name}`}
      >
        {isSubmitting ? "Alterando..." : action}
      </Button>
      {message ? (
        <span role="alert" className={styles.statusError}>
          {message}
        </span>
      ) : null}
    </div>
  );
}
