import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./uiPrimitives";
import styles from "./FitPageContent.module.css";

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  contentClassName?: string;
  density?: "standard" | "data";
};

/** Fluid workspace with bounded gutters; reading and form measures belong to consumers. */
export function FitPageContent({
  children,
  className,
  contentClassName,
  density = "standard",
  id = "main-content",
  ...props
}: Props) {
  return (
    <main
      {...props}
      id={id}
      tabIndex={-1}
      className={cn(styles.main, styles[density], className)}
    >
      <div className={cn(styles.content, contentClassName)}>{children}</div>
    </main>
  );
}
