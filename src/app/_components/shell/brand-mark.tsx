import { classNames } from "../ui/class-names";
import styles from "./brand-mark.module.css";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Marca do Comissia, a mesma do favicon (`src/app/icon.svg`). */
export function BrandMark({ size = "md", className }: BrandMarkProps) {
  return (
    <svg
      className={classNames(styles.mark, styles[size], className)}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect className={styles.surface} width="64" height="64" rx="16" />
      <path
        className={styles.letter}
        d="M43 21a15 15 0 1 0 0 22"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <rect
        className={styles.accent}
        x="40"
        y="27"
        width="15"
        height="10"
        rx="5"
      />
    </svg>
  );
}
