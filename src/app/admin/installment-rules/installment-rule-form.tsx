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
  Select,
  Textarea,
} from "@/app/_components/ui/field";
import {
  readApiResult,
  readFieldErrors,
  readMessage,
} from "@/app/admin/_utils/api-result";

const RULE_FIELDS = [
  "administratorId",
  "product",
  "effectiveFrom",
  "installmentPercentages",
] as const;

type RuleField = (typeof RULE_FIELDS)[number];

type AdministratorOption = {
  id: string;
  name: string;
};

type InstallmentRuleFormProps = {
  administrators: AdministratorOption[];
  defaultEffectiveFrom: string;
};

export function InstallmentRuleForm({
  administrators,
  defaultEffectiveFrom,
}: InstallmentRuleFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RuleField, string>>
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
        "/api/admin/administrator-installment-rules",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            administratorId: form.get("administratorId"),
            product: form.get("product"),
            effectiveFrom: form.get("effectiveFrom"),
            installmentPercentages: form.get("installmentPercentages"),
          }),
        },
      );
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(readMessage(result, "Não foi possível cadastrar a régua"));
        setFieldErrors(readFieldErrors(result, RULE_FIELDS));
        return;
      }

      formElement.reset();
      setSuccess("Nova vigência da régua cadastrada com sucesso");
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
          controlId="new-rule-administrator"
          label="Administradora"
          error={fieldErrors.administratorId}
        >
          <Select name="administratorId" defaultValue="" required>
            <option value="" disabled>
              Selecione
            </option>
            {administrators.map((administrator) => (
              <option key={administrator.id} value={administrator.id}>
                {administrator.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          controlId="new-rule-product"
          label="Produto ou plano"
          error={fieldErrors.product}
        >
          <Input
            name="product"
            maxLength={120}
            placeholder="Auto Leve"
            required
          />
        </Field>

        <Field
          controlId="new-rule-effective-from"
          label="Início da vigência"
          error={fieldErrors.effectiveFrom}
        >
          <Input
            name="effectiveFrom"
            type="date"
            numeric
            defaultValue={defaultEffectiveFrom}
            required
          />
        </Field>

        <Field
          controlId="new-rule-distribution"
          label="Distribuição das parcelas"
          hint="Um percentual por parcela, da primeira à última, separados por ponto e vírgula."
          error={fieldErrors.installmentPercentages}
          wide
        >
          <Textarea
            name="installmentPercentages"
            numeric
            rows={3}
            placeholder="0,75; 0,50; 0,25"
            required
          />
        </Field>
      </FormGrid>

      {message ? <Alert tone="critical">{message}</Alert> : null}
      {success ? <Alert tone="positive">{success}</Alert> : null}

      <FormActions>
        <Button type="submit" icon={Plus} disabled={isSubmitting}>
          {isSubmitting ? "Cadastrando..." : "Cadastrar vigência"}
        </Button>
      </FormActions>
    </Form>
  );
}
