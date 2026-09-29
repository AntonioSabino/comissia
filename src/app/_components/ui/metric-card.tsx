import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./metric-card.module.css";

type MetricGridProps = {
  /** Nome acessível da lista de números. */
  label: string;
  columns?: 3 | 4;
  children: ReactNode;
};

/** Lista de métricas lado a lado; quebra em duas e depois em uma coluna. */
export function MetricGrid({ label, columns = 4, children }: MetricGridProps) {
  return (
    <ul
      className={classNames(styles.grid, columns === 3 && styles.three)}
      aria-label={label}
    >
      {children}
    </ul>
  );
}

type MetricCardProps = {
  icon: LucideIcon;
  label: ReactNode;
  /** O número em destaque, já formatado. */
  value: ReactNode;
  note?: ReactNode;
  /** `li` dentro de um `MetricGrid`; `div` quando o card está sozinho. */
  as?: "li" | "div";
};

/**
 * Card de métrica do Design System (`MetricCard`): ícone, rótulo, valor e
 * nota. O card é contêiner: quando fica estreito, o ícone sobe e o valor ganha
 * a largura toda, em vez de quebrar no meio do número.
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  as: Tag = "li",
}: MetricCardProps) {
  return (
    <Tag className={styles.metric}>
      <div className={styles.inner}>
        <span className={styles.icon}>
          <Icon size={26} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className={styles.text}>
          <span className={styles.label}>{label}</span>
          <strong className={`num ${styles.value}`}>{value}</strong>
          {note ? <span className={styles.note}>{note}</span> : null}
        </div>
      </div>
    </Tag>
  );
}
