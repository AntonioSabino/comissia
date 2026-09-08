"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  readApiResult,
  readFieldErrors,
  readMessage,
} from "../_utils/api-result";

const RATE_FIELDS = ["ratePercentage", "effectiveFrom"] as const;

type RateField = (typeof RATE_FIELDS)[number];

type SellerRateFormProps = {
  sellerId: string;
  defaultEffectiveFrom: string;
};

export function SellerRateForm({
  sellerId,
  defaultEffectiveFrom,
}: SellerRateFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RateField, string>>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setFieldErrors({});
    setMessage(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/sellers/${sellerId}/commission-rates`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ratePercentage: form.get("ratePercentage"),
            effectiveFrom: form.get("effectiveFrom"),
          }),
        },
      );
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(
          readMessage(result, "Não foi possível registrar a vigência"),
        );
        setFieldErrors(readFieldErrors(result, RATE_FIELDS));
        return;
      }

      formElement.reset();
      setSuccess("Nova vigência registrada com sucesso");
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldError(field: RateField) {
    const error = fieldErrors[field];

    return error ? <span className="field-error">{error}</span> : null;
  }

  return (
    <form className="seller-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <label>
          Novo percentual
          <div className="input-suffix">
            <input
              name="ratePercentage"
              inputMode="decimal"
              placeholder="2,50"
              required
              aria-invalid={Boolean(fieldErrors.ratePercentage)}
            />
            <span>%</span>
          </div>
          {fieldError("ratePercentage")}
        </label>

        <label>
          Início da vigência
          <input
            name="effectiveFrom"
            type="date"
            defaultValue={defaultEffectiveFrom}
            required
            aria-invalid={Boolean(fieldErrors.effectiveFrom)}
          />
          {fieldError("effectiveFrom")}
        </label>
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

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Registrando..." : "Registrar vigência"}
      </button>
    </form>
  );
}
