"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import { DataTable } from "@/app/_components/ui/data-table";
import { Field, Select } from "@/app/_components/ui/field";
import { StatusBadge } from "@/app/_components/ui/status-badge";
import { QUOTA_STATUS_LABELS, QUOTA_STATUS_TONES } from "@/app/_utils/quota";
import { readApiResult, readMessage } from "@/app/admin/_utils/api-result";
import {
  QUOTA_STATUSES,
  type QuotaStatus,
} from "@/modules/sales/domain/quota-status";
import type { QuotaStatusHistoryEntry } from "@/modules/sales/application/quota-status-repository";
import styles from "./quota-status-panel.module.css";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type QuotaStatusPanelProps = {
  saleId: string;
  currentStatus: QuotaStatus;
  history: QuotaStatusHistoryEntry[];
};

function formatChangedAt(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

export function QuotaStatusPanel({
  saleId,
  currentStatus,
  history,
}: QuotaStatusPanelProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] =
    useState<QuotaStatus>(currentStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/sales/${saleId}/quota-status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (!response.ok) {
        setError(
          readMessage(
            await readApiResult(response),
            "Não foi possível alterar a situação da cota",
          ),
        );
        return;
      }

      setMessage("Situação da cota atualizada e registrada no histórico.");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card flush aria-labelledby="quota-status-title">
      <CardHeading
        titleId="quota-status-title"
        kicker="Auditoria"
        title="Situação da cota"
        description="A mudança fica registrada com a situação anterior, a nova situação e a data. Neste incremento, ela não recalcula nem cancela parcelas."
      />

      <div className={styles.controls}>
        <div className={styles.current}>
          <span>Situação atual</span>
          <StatusBadge tone={QUOTA_STATUS_TONES[currentStatus]}>
            {QUOTA_STATUS_LABELS[currentStatus]}
          </StatusBadge>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Field controlId="quota-status" label="Nova situação">
            <Select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as QuotaStatus)
              }
              disabled={isSubmitting}
            >
              {QUOTA_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {QUOTA_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="submit"
            disabled={isSubmitting || selectedStatus === currentStatus}
          >
            {isSubmitting ? "Salvando..." : "Salvar situação"}
          </Button>
        </form>

        {message ? <Alert tone="positive">{message}</Alert> : null}
        {error ? <Alert tone="critical">{error}</Alert> : null}
      </div>

      <DataTable>
        <thead>
          <tr>
            <th>Sequência</th>
            <th>Data</th>
            <th>De</th>
            <th>Para</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.id}>
              <td className="num">{entry.sequence}</td>
              <td className="num">
                <time dateTime={entry.changedAt}>
                  {formatChangedAt(entry.changedAt)}
                </time>
              </td>
              <td>
                {entry.previousStatus
                  ? QUOTA_STATUS_LABELS[entry.previousStatus]
                  : "Cadastro"}
              </td>
              <td>
                <StatusBadge tone={QUOTA_STATUS_TONES[entry.status]}>
                  {QUOTA_STATUS_LABELS[entry.status]}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </Card>
  );
}
