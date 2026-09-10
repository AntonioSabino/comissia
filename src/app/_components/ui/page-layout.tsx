import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./page-layout.module.css";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
  actions,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerText}>
          {breadcrumb && breadcrumb.length > 0 ? (
            <nav aria-label="Trilha de navegação" className={styles.breadcrumb}>
              <ol>
                {breadcrumb.map((item, index) => {
                  const isCurrent = index === breadcrumb.length - 1;

                  return (
                    <li key={`${index}-${item.label}`}>
                      {index > 0 ? (
                        <ChevronRight size={13} aria-hidden="true" />
                      ) : null}
                      {item.href && !isCurrent ? (
                        <Link href={item.href}>{item.label}</Link>
                      ) : (
                        <span aria-current={isCurrent ? "page" : undefined}>
                          {item.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : null}
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={classNames(styles.body, className)}>{children}</div>;
}

/** Conteúdo principal e coluna lateral; empilha abaixo de 1120px. */
export function TwoColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames(styles.twoColumn, className)}>{children}</div>
  );
}
