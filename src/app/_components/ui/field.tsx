import { Search } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { classNames } from "./class-names";
import styles from "./field.module.css";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wide?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  hint,
  error,
  wide,
  children,
  className,
}: FieldProps) {
  return (
    <label className={classNames(styles.field, wide && styles.wide, className)}>
      <span className={styles.label}>{label}</span>
      {children}
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Usa a fonte monoespaçada com algarismos tabulares (valores, datas e códigos). */
  numeric?: boolean;
  suffix?: string;
};

export function Input({ numeric, suffix, className, ...rest }: InputProps) {
  const input = (
    <input
      className={classNames(
        styles.control,
        numeric && styles.numeric,
        suffix ? styles.suffixed : undefined,
        className,
      )}
      {...rest}
    />
  );

  if (!suffix) {
    return input;
  }

  return (
    <span className={styles.suffixGroup}>
      {input}
      <span className={styles.suffix} aria-hidden="true">
        {suffix}
      </span>
    </span>
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames(styles.control, styles.select, className)}
      {...rest}
    >
      {children}
    </select>
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={classNames(styles.checkbox, className)}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function FormGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classNames(styles.grid, className)}>{children}</div>;
}

type SearchBoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function SearchBox({ className, ...rest }: SearchBoxProps) {
  return (
    <span className={classNames(styles.search, className)}>
      <Search size={17} strokeWidth={1.8} aria-hidden="true" />
      <input type="search" {...rest} />
    </span>
  );
}
