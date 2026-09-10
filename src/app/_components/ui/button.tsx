import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import styles from "./button.module.css";
import { classNames } from "./class-names";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonAppearance = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
  fullWidth?: boolean;
};

function appearanceClassName(
  { variant = "primary", size = "md", fullWidth }: ButtonAppearance,
  className?: string,
) {
  return classNames(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    className,
  );
}

function ButtonContent({
  icon: Icon,
  iconAfter: IconAfter,
  size,
  children,
}: ButtonAppearance & { children?: ReactNode }) {
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <>
      {Icon ? (
        <Icon size={iconSize} strokeWidth={1.8} aria-hidden="true" />
      ) : null}
      {children}
      {IconAfter ? (
        <IconAfter size={iconSize} strokeWidth={1.8} aria-hidden="true" />
      ) : null}
    </>
  );
}

type ButtonProps = ButtonAppearance & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant,
  size,
  icon,
  iconAfter,
  fullWidth,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={appearanceClassName({ variant, size, fullWidth }, className)}
      {...rest}
    >
      <ButtonContent icon={icon} iconAfter={iconAfter} size={size}>
        {children}
      </ButtonContent>
    </button>
  );
}

type ButtonLinkProps = ButtonAppearance & ComponentProps<typeof Link>;

export function ButtonLink({
  variant,
  size,
  icon,
  iconAfter,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={appearanceClassName({ variant, size, fullWidth }, className)}
      {...rest}
    >
      <ButtonContent icon={icon} iconAfter={iconAfter} size={size}>
        {children}
      </ButtonContent>
    </Link>
  );
}
