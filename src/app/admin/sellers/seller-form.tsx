"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import {
  Checkbox,
  Field,
  Form,
  FormActions,
  FormGrid,
  Input,
} from "@/app/_components/ui/field";
import { MaskedInput } from "@/app/_components/ui/masked-input";
import {
  readApiResult,
  readFieldErrors,
  readMessage,
} from "@/app/admin/_utils/api-result";

const REGISTRATION_FIELDS = [
  "name",
  "document",
  "email",
  "phone",
  "active",
  "ratePercentage",
  "effectiveFrom",
] as const;

type RegistrationField = (typeof REGISTRATION_FIELDS)[number];

type FieldErrors = Partial<Record<RegistrationField, string>>;

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
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(
          readMessage(result, "Não foi possível cadastrar o vendedor"),
        );
        setFieldErrors(readFieldErrors(result, REGISTRATION_FIELDS));
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

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <FormGrid>
        <Field
          controlId="new-seller-name"
          label="Nome"
          wide
          error={fieldErrors.name}
        >
          <Input
            name="name"
            maxLength={160}
            required
            aria-invalid={Boolean(fieldErrors.name)}
          />
        </Field>

        <Field
          controlId="new-seller-document"
          label="CPF"
          error={fieldErrors.document}
        >
          <MaskedInput
            mask="cpf"
            name="document"
            numeric
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
            required
            aria-invalid={Boolean(fieldErrors.document)}
          />
        </Field>

        <Field
          controlId="new-seller-email"
          label="E-mail"
          error={fieldErrors.email}
        >
          <Input
            name="email"
            type="email"
            maxLength={254}
            required
            aria-invalid={Boolean(fieldErrors.email)}
          />
        </Field>

        <Field
          controlId="new-seller-phone"
          label="Telefone"
          error={fieldErrors.phone}
        >
          <MaskedInput
            mask="phone"
            name="phone"
            type="tel"
            numeric
            placeholder="(11) 99999-9999"
            maxLength={15}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
        </Field>

        <Field
          controlId="new-seller-rate"
          label="Percentual inicial"
          error={fieldErrors.ratePercentage}
        >
          <MaskedInput
            mask="percent"
            name="ratePercentage"
            numeric
            inputMode="decimal"
            placeholder="2,50"
            suffix="%"
            required
            aria-invalid={Boolean(fieldErrors.ratePercentage)}
          />
        </Field>

        <Field
          controlId="new-seller-effective-from"
          label="Início da vigência"
          error={fieldErrors.effectiveFrom}
        >
          <Input
            name="effectiveFrom"
            type="date"
            numeric
            required
            aria-invalid={Boolean(fieldErrors.effectiveFrom)}
          />
        </Field>
      </FormGrid>

      <Checkbox name="active" defaultChecked label="Vendedor ativo" />

      {message ? <Alert tone="critical">{message}</Alert> : null}
      {success ? <Alert tone="positive">{success}</Alert> : null}

      <FormActions>
        <Button type="submit" icon={UserPlus} disabled={isSubmitting}>
          {isSubmitting ? "Cadastrando..." : "Cadastrar vendedor"}
        </Button>
      </FormActions>
    </Form>
  );
}
