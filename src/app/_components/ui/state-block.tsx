import { CircleAlert, FileSpreadsheet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./state-block.module.css";

type StateBlockProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon = FileSpreadsheet,
  title,
  description,
  action,
  className,
}: StateBlockProps & { icon?: LucideIcon }) {
  return (
    <div className={classNames(styles.block, className)}>
      <span className={classNames(styles.badge, styles.emptyBadge)}>
        <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <strong className={styles.title}>{title}</strong>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
  className,
}: StateBlockProps) {
  return (
    <div role="alert" className={classNames(styles.block, className)}>
      <span className={classNames(styles.badge, styles.errorBadge)}>
        <CircleAlert size={24} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <strong className={styles.title}>{title}</strong>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

type LoadingRowsProps = {
  rows?: number;
  columns?: number;
  label?: string;
};

export function LoadingRows({
  rows = 4,
  columns = 5,
  label = "Carregando",
}: LoadingRowsProps) {
  return (
    <div className={styles.loading} role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={styles.loadingRow}>
          {Array.from({ length: columns }, (_, column) => (
            <span key={column} className={styles.skeleton} />
          ))}
        </div>
      ))}
    </div>
  );
}
