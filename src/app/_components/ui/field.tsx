import { Search } from "lucide-react";
import { cloneElement } from "react";
import type {
  FormHTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { classNames } from "./class-names";
import styles from "./field.module.css";

export function Form({
  className,
  ...rest
}: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={classNames(styles.form, className)} {...rest} />;
}

export function FormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames(styles.actions, className)}>{children}</div>
  );
}

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling";
};

type FieldProps = {
  controlId: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wide?: boolean;
  children: ReactElement<FieldControlProps>;
  className?: string;
};

export function Field({
  controlId,
  label,
  hint,
  error,
  wide,
  children,
  className,
}: FieldProps) {
  const messageId = error
    ? `${controlId}-error`
    : hint
      ? `${controlId}-hint`
      : undefined;
  const describedBy = [children.props["aria-describedby"], messageId]
    .filter(Boolean)
    .join(" ");

  const control = cloneElement(children, {
    id: children.props.id ?? controlId,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  });

  return (
    <label
      htmlFor={children.props.id ?? controlId}
      className={classNames(styles.field, wide && styles.wide, className)}
    >
      <span className={styles.label}>{label}</span>
      {control}
      {error ? (
        <span id={messageId} className={styles.error}>
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className={styles.hint}>
          {hint}
        </span>
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

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Usa a fonte monoespaçada com algarismos tabulares (listas de valores). */
  numeric?: boolean;
};

export function Textarea({ numeric, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={classNames(
        styles.control,
        styles.textarea,
        numeric && styles.numeric,
        className,
      )}
      {...rest}
    />
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
