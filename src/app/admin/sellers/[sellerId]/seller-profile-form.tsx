"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  readApiResult,
  readFieldErrors,
  readMessage,
} from "../_utils/api-result";

const PROFILE_FIELDS = ["name", "document", "email", "phone"] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

type SellerProfileFormProps = {
  sellerId: string;
  name: string;
  document: string;
  email: string;
  phone: string;
};

export function SellerProfileForm({
  sellerId,
  name,
  document,
  email,
  phone,
}: SellerProfileFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ProfileField, string>>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setFieldErrors({});
    setMessage(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          document: form.get("document"),
          email: form.get("email"),
          phone: form.get("phone"),
        }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(
          readMessage(result, "Não foi possível salvar os dados do vendedor"),
        );
        setFieldErrors(readFieldErrors(result, PROFILE_FIELDS));
        return;
      }

      setSuccess("Dados atualizados com sucesso");
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldError(field: ProfileField) {
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
            defaultValue={name}
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
            defaultValue={document}
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
            defaultValue={email}
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
            defaultValue={phone}
            type="tel"
            placeholder="(11) 99999-9999"
            maxLength={20}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldError("phone")}
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
        {isSubmitting ? "Salvando..." : "Salvar dados"}
      </button>
    </form>
  );
}
