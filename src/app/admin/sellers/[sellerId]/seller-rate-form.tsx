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

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <FormGrid>
        <Field
          controlId="seller-rate-percentage"
          label="Novo percentual"
          error={fieldErrors.ratePercentage}
        >
          <Input
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
          controlId="seller-rate-effective-from"
          label="Início da vigência"
          error={fieldErrors.effectiveFrom}
        >
          <Input
            name="effectiveFrom"
            type="date"
            numeric
            defaultValue={defaultEffectiveFrom}
            required
            aria-invalid={Boolean(fieldErrors.effectiveFrom)}
          />
        </Field>
      </FormGrid>

      {message ? <Alert tone="critical">{message}</Alert> : null}
      {success ? <Alert tone="positive">{success}</Alert> : null}

      <FormActions>
        <Button type="submit" icon={Plus} disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar vigência"}
        </Button>
      </FormActions>
    </Form>
  );
}
