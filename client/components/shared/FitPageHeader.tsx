import { cn, fitText, fitType } from "./uiPrimitives";
import type { ReactNode } from "react";
import Head from "next/head";
import styles from "./FitPageHeader.module.css";

export function FitPageHeader({
  className,
  subtitle,
  subtitleClassName,
  title,
  eyebrow = "FIT research workspace",
  actions,
}: {
  className?: string;
  subtitle: string;
  subtitleClassName?: string;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={cn(styles.header, className)}>
      <Head>
        <title>{`${title} | FIT`}</title>
      </Head>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1
          className={cn(
            "text-balance",
            styles.title,
            fitText.strong,
            fitType.pageTitle,
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "text-pretty",
            styles.subtitle,
            fitType.body,
            fitText.body,
            subtitleClassName ?? "max-w-[42rem]",
          )}
        >
          {subtitle}
        </p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
