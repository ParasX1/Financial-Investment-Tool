import * as React from "react";
import { fitNav } from "@/components/shared/fitStyles";
import { FitPageHeader } from "@/components/shared/FitPageHeader";
import { FitPageShell } from "@/components/shared/FitPageShell";
import {
  FIT_CONTENT_MAX_WIDTH_PX,
  FIT_FOCUS_VISIBLE,
  cn,
  fitText,
  fitType,
} from "@/components/shared/uiPrimitives";
import styles from "./LearningPageLayout.module.css";
import type { LearningIcon, LearningNavItem } from "./types";

export const LEARNING_FOCUS_VISIBLE = FIT_FOCUS_VISIBLE;

const cardToneClasses = {
  default: styles.cardDefault,
  accent: styles.cardAccent,
  support: styles.cardSupport,
} as const;

export function LearningPageLayout({
  activeId,
  children,
  mainId = "main-content",
  navIcon: NavIcon,
  navItems,
  navTitle,
  onNavChange,
  skipLabel,
  subtitle,
  title,
}: {
  activeId: string;
  children: React.ReactNode;
  mainId?: string;
  navIcon: LearningIcon;
  navItems: LearningNavItem[];
  navTitle: string;
  onNavChange: (id: string) => void;
  skipLabel: string;
  subtitle: string;
  title: string;
}) {
  const contentRef = React.useRef<HTMLElement | null>(null);
  const activeLabel =
    navItems.find((item) => item.id === activeId)?.label ?? navTitle;

  const handleNavChange = React.useCallback(
    (id: string) => {
      onNavChange(id);

      window.requestAnimationFrame(() => {
        contentRef.current?.scrollIntoView({ block: "start" });
        contentRef.current?.focus({ preventScroll: true });
      });
    },
    [onNavChange],
  );

  return (
    <FitPageShell
      className={styles.root}
      skipLabel={skipLabel}
      skipTargetId={mainId}
    >
      <main
        id={mainId}
        tabIndex={-1}
        className="ml-[var(--app-sidebar-width,64px)] min-h-screen overflow-x-hidden bg-transparent px-3 pb-8 pt-8 text-white transition-[margin-left] duration-200 ease-out sm:px-5 sm:pb-10 sm:pt-10 lg:px-6 xl:px-7"
      >
        <div
          className="mx-auto w-full"
          style={{ maxWidth: FIT_CONTENT_MAX_WIDTH_PX }}
        >
          <FitPageHeader title={title} subtitle={subtitle} />

          <div className="grid min-w-0 gap-5 lg:grid-cols-[224px_minmax(0,1fr)] lg:items-start">
            <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
              <div className={cn("rounded-xl p-3", styles.navPanel)}>
                <div
                  className={cn(
                    "mb-3 flex items-center gap-2 px-2",
                    fitText.nav,
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                      styles.headerIcon,
                    )}
                    aria-hidden="true"
                  >
                    <NavIcon sx={{ fontSize: 18 }} />
                  </span>
                  <span className={cn("min-w-0 truncate", fitType.navLabel)}>
                    {navTitle}
                  </span>
                </div>

                <nav aria-label={navTitle}>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {navItems.map((item) => {
                      const active = activeId === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavChange(item.id)}
                          aria-pressed={active}
                          className={cn(
                            fitNav.itemBase,
                            active ? styles.navItemActive : styles.navItemIdle,
                            LEARNING_FOCUS_VISIBLE,
                          )}
                        >
                          <span
                            className={cn(
                              "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
                              styles.contentIcon,
                              active ? styles.iconActive : styles.iconIdle,
                            )}
                            aria-hidden="true"
                          >
                            <Icon sx={{ fontSize: 18 }} />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cn("block truncate", fitType.navLabel)}
                            >
                              {item.label}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </div>
            </aside>

            <section
              ref={contentRef}
              aria-label={`${activeLabel} content`}
              className={cn(
                "min-w-0 scroll-mt-6 rounded-xl",
                LEARNING_FOCUS_VISIBLE,
              )}
              tabIndex={-1}
            >
              {children}
            </section>
          </div>
        </div>
      </main>
    </FitPageShell>
  );
}

export function LearningCard({
  children,
  icon: Icon,
  title,
  tone = "default",
}: {
  children: React.ReactNode;
  icon: LearningIcon;
  title: string;
  tone?: keyof typeof cardToneClasses;
}) {
  return (
    <section
      className={cn("rounded-xl p-[18px] sm:p-5", cardToneClasses[tone])}
    >
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md",
            styles.contentIcon,
            fitText.accent,
          )}
          aria-hidden="true"
        >
          <Icon sx={{ fontSize: 19 }} />
        </span>
        <h2 className={cn("min-w-0 truncate text-white", fitType.panelTitle)}>
          {title}
        </h2>
      </div>
      <div className={cn("text-pretty", fitType.body, fitText.body)}>
        {children}
      </div>
    </section>
  );
}

export function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <code
      className={cn(
        "block overflow-x-auto px-4 py-3 font-mono text-[var(--fit-color-accent-strong)]",
        fitType.bodySm,
        "rounded-lg",
        styles.formula,
      )}
      translate="no"
    >
      {children}
    </code>
  );
}

export function QuestionCard({
  answer,
  index,
  question,
}: {
  answer: string;
  index: number;
  question: string;
}) {
  return (
    <article className={cn("rounded-xl p-[18px] sm:p-5", styles.cardDefault)}>
      <div className="flex min-w-0 items-start gap-4">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full tabular-nums",
            fitType.metric,
            styles.questionBadge,
          )}
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div className="min-w-0">
          <h2 className={cn("text-pretty text-white", fitType.panelTitle)}>
            {question}
          </h2>
          <p className={cn("mt-2 text-pretty", fitType.body, fitText.body)}>
            {answer}
          </p>
        </div>
      </div>
    </article>
  );
}

export function LearningTopicCard({
  children,
  eyebrow,
  tone = "default",
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  tone?: keyof typeof cardToneClasses;
  title: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl p-[18px] sm:p-6",
        tone === "default" ? styles.topicCard : cardToneClasses[tone],
      )}
    >
      {eyebrow ? (
        <p className={cn("uppercase", fitType.eyebrow, fitText.label)}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-balance text-white",
          fitType.sectionTitle,
          eyebrow ? "mt-2" : "mt-0",
        )}
      >
        {title}
      </h2>
      <div
        className={cn(
          "mt-3 max-w-[56rem] text-pretty",
          fitType.body,
          fitText.body,
        )}
      >
        {children}
      </div>
    </section>
  );
}
