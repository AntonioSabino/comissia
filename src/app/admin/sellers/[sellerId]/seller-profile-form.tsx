"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import {
  Field,
  Form,
  FormActions,
  FormGrid,
  Input,
} from "@/app/_components/ui/field";
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

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <FormGrid>
        <Field label="Nome" wide error={fieldErrors.name}>
          <Input
            name="name"
            defaultValue={name}
            maxLength={160}
            required
            aria-invalid={Boolean(fieldErrors.name)}
          />
        </Field>

        <Field label="CPF" error={fieldErrors.document}>
          <Input
            name="document"
            defaultValue={document}
            numeric
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
            required
            aria-invalid={Boolean(fieldErrors.document)}
          />
        </Field>

        <Field label="E-mail" error={fieldErrors.email}>
          <Input
            name="email"
            defaultValue={email}
            type="email"
            maxLength={254}
            required
            aria-invalid={Boolean(fieldErrors.email)}
          />
        </Field>

        <Field label="Telefone" error={fieldErrors.phone}>
          <Input
            name="phone"
            defaultValue={phone}
            type="tel"
            numeric
            placeholder="(11) 99999-9999"
            maxLength={20}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
        </Field>
      </FormGrid>

      {message ? <Alert tone="critical">{message}</Alert> : null}
      {success ? <Alert tone="positive">{success}</Alert> : null}

      <FormActions>
        <Button type="submit" icon={Save} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar dados"}
        </Button>
      </FormActions>
    </Form>
  );
}
