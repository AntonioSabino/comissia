import type { ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./status-badge.module.css";

/** Os cinco tons do Design System; um estado novo é mapeado para um deles. */
export type StatusTone =
  "received" | "pending" | "cancelled" | "reconciled" | "neutral";

type StatusBadgeProps = {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span className={classNames(styles.badge, styles[tone], className)}>
      {children}
    </span>
  );
}
