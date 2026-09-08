"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type SellerStatusFormProps = {
  sellerId: string;
  active: boolean;
};

type ApiResult = {
  message?: unknown;
};

async function parseApiResult(response: Response): Promise<ApiResult> {
  try {
    const result: unknown = await response.json();

    return result !== null &&
      typeof result === "object" &&
      !Array.isArray(result)
      ? (result as ApiResult)
      : {};
  } catch {
    return {};
  }
}

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
      const result = await parseApiResult(response);

      if (!response.ok) {
        setMessage(
          typeof result.message === "string"
            ? result.message
            : "Não foi possível alterar a situação do vendedor",
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
    <form className="seller-status-form" onSubmit={handleSubmit}>
      <div>
        <h3>{active ? "Inativar vendedor" : "Reativar vendedor"}</h3>
        <p>
          {active
            ? "O vendedor continuará consultável, mas não ficará disponível para novas vendas."
            : "O vendedor voltará a ficar disponível para novas vendas."}
        </p>
      </div>

      {message ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}
      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        className={active ? "danger-button" : "primary-button"}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Alterando..."
          : active
            ? "Inativar vendedor"
            : "Reativar vendedor"}
      </button>
    </form>
  );
}
