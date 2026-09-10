import type { ReactNode, TableHTMLAttributes } from "react";
import { classNames } from "./class-names";
import styles from "./data-table.module.css";

export function DataToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames(styles.toolbar, className)}>{children}</div>
  );
}

/**
 * Tabela densa do Design System. As células de valor, percentual, data e código
 * usam a classe global `num` para alinhar os algarismos.
 */
export function DataTable({
  className,
  children,
  ...rest
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className={styles.scroll}>
      <table className={classNames(styles.table, className)} {...rest}>
        {children}
      </table>
    </div>
  );
}
