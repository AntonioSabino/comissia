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
} from "@/app/_components/ui/field";
import {
  readApiResult,
  readFieldErrors,
  readMessage,
} from "@/app/admin/_utils/api-result";

const SALE_FIELDS = [
  "administratorId",
  "sellerId",
  "customerName",
  "product",
  "groupCode",
  "quotaCode",
  "soldOn",
  "creditAmount",
  "commissionInstallments",
  "firstInstallmentDueOn",
] as const;

type SaleField = (typeof SALE_FIELDS)[number];

type Option = {
  id: string;
  name: string;
};

type SaleFormProps = {
  administrators: Option[];
  sellers: Option[];
  today: string;
};

export function SaleForm({ administrators, sellers, today }: SaleFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<SaleField, string>>
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
      const response = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(
            SALE_FIELDS.map((field) => [field, form.get(field)]),
          ),
        ),
      });
      const result = await readApiResult(response);

      if (!response.ok) {
        setMessage(readMessage(result, "Não foi possível cadastrar a venda"));
        setFieldErrors(readFieldErrors(result, SALE_FIELDS));
        return;
      }

      const code = (result as { code?: unknown }).code;

      formElement.reset();
      setSuccess(
        typeof code === "string"
          ? `Venda ${code} cadastrada com sucesso`
          : "Venda cadastrada com sucesso",
      );
      // A listagem é renderizada no servidor: sem isto, a venda recém-cadastrada
      // só apareceria depois de recarregar a página.
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
          controlId="new-sale-administrator"
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
          controlId="new-sale-seller"
          label="Vendedor"
          error={fieldErrors.sellerId}
        >
          <Select name="sellerId" defaultValue="" required>
            <option value="" disabled>
              Selecione
            </option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          controlId="new-sale-customer"
          label="Cliente"
          wide
          error={fieldErrors.customerName}
        >
          <Input name="customerName" maxLength={160} required />
        </Field>

        <Field
          controlId="new-sale-product"
          label="Produto"
          error={fieldErrors.product}
        >
          <Input name="product" maxLength={120} placeholder="Imóvel" required />
        </Field>

        <Field
          controlId="new-sale-credit"
          label="Crédito vendido"
          error={fieldErrors.creditAmount}
        >
          <Input
            name="creditAmount"
            numeric
            inputMode="decimal"
            placeholder="R$ 200.000,00"
            maxLength={24}
            required
          />
        </Field>

        <Field
          controlId="new-sale-group"
          label="Grupo"
          error={fieldErrors.groupCode}
        >
          <Input
            name="groupCode"
            numeric
            maxLength={20}
            placeholder="1234"
            required
          />
        </Field>

        <Field
          controlId="new-sale-quota"
          label="Cota"
          error={fieldErrors.quotaCode}
        >
          <Input
            name="quotaCode"
            numeric
            maxLength={20}
            placeholder="567"
            required
          />
        </Field>

        <Field
          controlId="new-sale-sold-on"
          label="Data da venda"
          error={fieldErrors.soldOn}
        >
          <Input
            name="soldOn"
            type="date"
            numeric
            defaultValue={today}
            max={today}
            required
          />
        </Field>

        <Field
          controlId="new-sale-installments"
          label="Parcelas da comissão"
          hint="De 1 a 120"
          error={fieldErrors.commissionInstallments}
        >
          <Input
            name="commissionInstallments"
            numeric
            inputMode="numeric"
            maxLength={3}
            placeholder="6"
            required
          />
        </Field>

        <Field
          controlId="new-sale-first-installment"
          label="Primeira previsão"
          hint="Data prevista da primeira parcela"
          error={fieldErrors.firstInstallmentDueOn}
        >
          <Input name="firstInstallmentDueOn" type="date" numeric required />
        </Field>
      </FormGrid>

      <Alert>
        O percentual do vendedor vigente na data da venda é gravado com ela.
        Alterações posteriores no acordo não recalculam esta venda.
      </Alert>

      {message ? <Alert tone="critical">{message}</Alert> : null}
      {success ? <Alert tone="positive">{success}</Alert> : null}

      <FormActions>
        <Button type="submit" icon={Plus} disabled={isSubmitting}>
          {isSubmitting ? "Cadastrando..." : "Cadastrar venda"}
        </Button>
      </FormActions>
    </Form>
  );
}
