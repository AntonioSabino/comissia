"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type FieldErrors = Partial<
  Record<
    | "name"
    | "document"
    | "email"
    | "phone"
    | "active"
    | "ratePercentage"
    | "effectiveFrom",
    string
  >
>;

type ApiResult = {
  message?: unknown;
  fieldErrors?: unknown;
};

function parseApiResult(value: ApiResult): {
  message: string;
  fieldErrors: FieldErrors;
} {
  const fieldErrors: FieldErrors = {};

  if (value.fieldErrors && typeof value.fieldErrors === "object") {
    for (const [field, message] of Object.entries(value.fieldErrors)) {
      if (typeof message === "string") {
        fieldErrors[field as keyof FieldErrors] = message;
      }
    }
  }

  return {
    message:
      typeof value.message === "string"
        ? value.message
        : "Não foi possível cadastrar o vendedor",
    fieldErrors,
  };
}

export function SellerForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
      const response = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          document: form.get("document"),
          email: form.get("email"),
          phone: form.get("phone"),
          active: form.get("active") === "on",
          ratePercentage: form.get("ratePercentage"),
          effectiveFrom: form.get("effectiveFrom"),
        }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        const parsed = parseApiResult(result);
        setMessage(parsed.message);
        setFieldErrors(parsed.fieldErrors);
        return;
      }

      formElement.reset();
      setSuccess("Vendedor cadastrado com sucesso");
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldError(field: keyof FieldErrors) {
    const error = fieldErrors[field];

    return error ? <span className="field-error">{error}</span> : null;
  }

  return (
    <form className="seller-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <label className="field-wide">
          Nome
          <input
            name="name"
            maxLength={160}
            required
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldError("name")}
        </label>

        <label>
          CPF
          <input
            name="document"
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
            required
            aria-invalid={Boolean(fieldErrors.document)}
          />
          {fieldError("document")}
        </label>

        <label>
          E-mail
          <input
            name="email"
            type="email"
            maxLength={254}
            required
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldError("email")}
        </label>

        <label>
          Telefone
          <input
            name="phone"
            type="tel"
            placeholder="(11) 99999-9999"
            maxLength={20}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldError("phone")}
        </label>

        <label>
          Percentual inicial
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
            required
            aria-invalid={Boolean(fieldErrors.effectiveFrom)}
          />
          {fieldError("effectiveFrom")}
        </label>

        <label className="checkbox-field">
          <input name="active" type="checkbox" defaultChecked />
          Vendedor ativo
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
        {isSubmitting ? "Cadastrando..." : "Cadastrar vendedor"}
      </button>
    </form>
  );
}
