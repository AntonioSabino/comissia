"use client";

import { Plus } from "lucide-react";
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
} from "@/app/admin/_utils/api-result";

const ADMINISTRATOR_FIELDS = ["name"] as const;

type AdministratorField = (typeof ADMINISTRATOR_FIELDS)[number];

export function AdministratorForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AdministratorField, string>>
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
      const response = await fetch("/api/admin/administrators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.get("name") }),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(
          readMessage(result, "Não foi possível cadastrar a administradora"),
        );
        setFieldErrors(readFieldErrors(result, ADMINISTRATOR_FIELDS));
        return;
      }

      formElement.reset();
      setSuccess("Administradora cadastrada com sucesso");
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
          controlId="new-administrator-name"
          label="Nome"
          error={fieldErrors.name}
        >
          <Input name="name" maxLength={160} required />
        </Field>
      </FormGrid>

      {message ? <Alert tone="critical">{message}</Alert> : null}
      {success ? <Alert tone="positive">{success}</Alert> : null}

      <FormActions>
        <Button type="submit" icon={Plus} disabled={isSubmitting}>
          {isSubmitting ? "Cadastrando..." : "Cadastrar administradora"}
        </Button>
      </FormActions>
    </Form>
  );
}
