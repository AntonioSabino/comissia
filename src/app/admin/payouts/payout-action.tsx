"use client";

import { Banknote, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useId, useRef, useState } from "react";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import { readApiResult, readMessage } from "@/app/admin/_utils/api-result";
import styles from "./payouts.module.css";

/**
 * Ícones pelo nome: este é um componente de cliente, e a página, que é de
 * servidor, não pode passar um componente (função) como prop para ele.
 */
const ICONS = {
  review: CheckCircle2,
  payment: Banknote,
} as const;

export type PayoutBreakdownLine = {
  label: string;
  note?: string;
  value: string;
  emphasis?: boolean;
};

type PayoutActionProps = {
  /** Rota que executa a transição. */
  endpoint: string;
  label: string;
  icon?: keyof typeof ICONS;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  /** Nome acessível do botão, quando o rótulo sozinho é ambíguo numa tabela. */
  accessibleLabel?: string;
  title: string;
  description: ReactNode;
  lines: PayoutBreakdownLine[];
  confirmLabel: string;
  successMessage: string;
  disabled?: boolean;
};

/**
 * Botão que abre uma confirmação antes de mudar a situação das parcelas. O
 * `<dialog>` aberto com `showModal()` já prende o foco, fecha com Esc e devolve
 * o foco ao botão que o abriu, então não há gestão de foco manual aqui.
 */
export function PayoutAction({
  endpoint,
  label,
  icon,
  variant = "primary",
  size = "md",
  accessibleLabel,
  title,
  description,
  lines,
  confirmLabel,
  successMessage,
  disabled,
}: PayoutActionProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function open() {
    setError(null);
    setMessage(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function confirm() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, { method: "POST" });

      if (!response.ok) {
        setError(
          readMessage(
            await readApiResult(response),
            "Não foi possível registrar o fechamento",
          ),
        );
        return;
      }

      close();
      setMessage(successMessage);
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.action}>
      <Button
        variant={variant}
        size={size}
        icon={icon ? ICONS[icon] : undefined}
        onClick={open}
        disabled={disabled}
        aria-label={accessibleLabel}
        aria-haspopup="dialog"
      >
        {label}
      </Button>

      <div className={styles.actionStatus} role="status">
        {message}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => setError(null)}
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        <p id={descriptionId} className={styles.dialogDescription}>
          {description}
        </p>

        <dl className={styles.breakdown}>
          {lines.map((line) => (
            <div
              key={line.label}
              className={line.emphasis ? styles.breakdownTotal : undefined}
            >
              <dt>
                {line.label}
                {line.note ? <small>{line.note}</small> : null}
              </dt>
              <dd className="num">{line.value}</dd>
            </div>
          ))}
        </dl>

        {error ? <Alert tone="critical">{error}</Alert> : null}

        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={close} disabled={isSubmitting}>
            Voltar
          </Button>
          <Button onClick={confirm} disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : confirmLabel}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
