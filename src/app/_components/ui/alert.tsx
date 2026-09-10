import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import styles from "./alert.module.css";
import { classNames } from "./class-names";

type AlertTone = "info" | "attention" | "positive" | "critical";

const icons: Record<AlertTone, LucideIcon> = {
  info: Info,
  attention: TriangleAlert,
  positive: CircleCheck,
  critical: CircleAlert,
};

const roles: Partial<Record<AlertTone, "alert" | "status">> = {
  critical: "alert",
  positive: "status",
};

type AlertProps = {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: AlertProps) {
  const Icon = icons[tone];

  return (
    <div
      role={roles[tone]}
      className={classNames(styles.alert, styles[tone], className)}
    >
      <Icon
        className={styles.icon}
        size={18}
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className={styles.content}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        {children}
      </span>
      {action}
    </div>
  );
}
