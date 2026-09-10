import type { HTMLAttributes, ReactNode } from "react";
import styles from "./card.module.css";
import { classNames } from "./class-names";

type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: "default" | "sunken";
  flush?: boolean;
};

export function Card({
  tone = "default",
  flush,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <section
      className={classNames(
        styles.card,
        tone === "sunken" && styles.sunken,
        flush && styles.flush,
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

type CardHeadingProps = {
  kicker?: ReactNode;
  title: ReactNode;
  titleId?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function CardHeading({
  kicker,
  title,
  titleId,
  action,
  children,
  className,
}: CardHeadingProps) {
  return (
    <div className={classNames(styles.heading, className)}>
      <div className={styles.headingText}>
        {kicker ? <span className={styles.kicker}>{kicker}</span> : null}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
