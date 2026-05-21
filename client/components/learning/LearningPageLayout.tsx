import * as React from "react";
import Sidebar from "@/components/sidebar";
import { fitButton, fitNav } from "@/components/shared/fitStyles";
import {
  FIT_CONTENT_MAX_WIDTH_PX,
  FIT_FOCUS_VISIBLE,
  cn,
  fitSurface,
  fitText,
} from "@/components/shared/uiPrimitives";
import type { LearningIcon, LearningNavItem } from "./types";

export const LEARNING_FOCUS_VISIBLE = FIT_FOCUS_VISIBLE;

const cardToneClasses = {
  default: "border-[rgba(132,146,176,0.12)] bg-[#09090b]",
  accent: "border-[#5367ff]/35 bg-[#5367ff]/10",
  support: "border-[#7b8cff]/30 bg-[#0b0b18]",
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
    <>
      <style jsx global>{`
        html,
        body,
        #__next {
          background: #000000;
          color-scheme: dark;
          min-height: 100%;
        }

        html {
          scrollbar-gutter: stable;
        }

        body {
          overflow-x: hidden;
        }
      `}</style>
      <div className={cn("min-h-screen overflow-x-hidden", fitSurface.page)}>
        <Sidebar skipLabel={skipLabel} skipTargetId={mainId} />
        <main
          id={mainId}
          tabIndex={-1}
          className="ml-[var(--app-sidebar-width,64px)] min-h-screen overflow-x-hidden bg-black px-3 pb-8 pt-8 text-white transition-[margin-left] duration-200 ease-out sm:px-8 sm:pb-10 sm:pt-10 lg:px-10"
        >
          <div
            className="mx-auto w-full"
            style={{ maxWidth: FIT_CONTENT_MAX_WIDTH_PX }}
          >
            <header className="mb-6 sm:mb-7">
              <h1 className="text-balance text-[28px] font-extrabold leading-tight tracking-normal text-white sm:text-[30px]">
                {title}
              </h1>
              <p
                className={cn(
                  "mt-2 max-w-[42rem] text-pretty text-[15px] leading-6",
                  fitText.body,
                )}
              >
                {subtitle}
              </p>
            </header>

            <div className="grid min-w-0 gap-5 lg:grid-cols-[224px_minmax(0,1fr)] lg:items-start">
              <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
                <section
                  className={cn(fitSurface.panel, "p-3")}
                  aria-label={navTitle}
                >
                  <div
                    className={cn(
                      "mb-3 flex items-center gap-2 px-2",
                      fitText.nav,
                    )}
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#14182d] via-[#151126] to-[#0f1016] text-[#8ea0ff] shadow-[inset_0_0_0_1px_rgba(123,140,255,0.16)]"
                      aria-hidden="true"
                    >
                      <NavIcon sx={{ fontSize: 18 }} />
                    </span>
                    <span className="min-w-0 truncate text-sm font-bold">
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
                              active ? fitNav.itemActive : fitNav.itemIdle,
                              LEARNING_FOCUS_VISIBLE,
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
                                active ? fitNav.iconActive : fitNav.iconIdle,
                              )}
                              aria-hidden="true"
                            >
                              <Icon sx={{ fontSize: 18 }} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold leading-tight">
                                {item.label}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </nav>
                </section>
              </aside>

              <section
                ref={contentRef}
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
      </div>
    </>
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
      className={cn(
        "rounded-xl border p-[18px] sm:p-5",
        cardToneClasses[tone],
      )}
    >
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#141419]",
            fitText.accent,
          )}
          aria-hidden="true"
        >
          <Icon sx={{ fontSize: 19 }} />
        </span>
        <h2 className="min-w-0 truncate text-base font-extrabold text-white">
          {title}
        </h2>
      </div>
      <div className={cn("text-pretty text-[15px] leading-7", fitText.body)}>
        {children}
      </div>
    </section>
  );
}

export function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="block overflow-x-auto rounded-lg border border-[#202230] bg-black/45 px-4 py-3 font-mono text-sm leading-6 text-[#8ea0ff]"
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
    <article className={cn(fitSurface.card, "p-[18px] sm:p-5")}>
      <div className="flex min-w-0 items-start gap-4">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#5367ff]/40 bg-[#5367ff]/15 text-sm font-extrabold tabular-nums text-[#dbe4ff]"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div className="min-w-0">
          <h2 className="text-pretty text-base font-extrabold leading-6 text-white">
            {question}
          </h2>
          <p
            className={cn(
              "mt-2 text-pretty text-[15px] leading-7",
              fitText.body,
            )}
          >
            {answer}
          </p>
        </div>
      </div>
    </article>
  );
}

export function LearningActionPanel({
  actionLabel,
  children,
  icon: Icon,
  onAction,
  status,
  title,
}: {
  actionLabel: string;
  children: React.ReactNode;
  icon?: LearningIcon;
  onAction: () => void;
  status?: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-[#7b8cff]/30 bg-[#0b0b18] p-5 text-center sm:p-6">
      {Icon ? (
        <span
          className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-[#5367ff]/15 text-[#dbe4ff]"
          aria-hidden="true"
        >
          <Icon sx={{ fontSize: 20 }} />
        </span>
      ) : null}
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <p
        className={cn(
          "mx-auto mt-2 max-w-[36rem] text-pretty text-[15px] leading-6",
          fitText.body,
        )}
      >
        {children}
      </p>
      <button
        type="button"
        onClick={onAction}
        className={cn(
          "mt-5 inline-flex min-h-[42px] touch-manipulation items-center justify-center rounded-lg px-4 text-sm font-bold",
          fitButton.primary,
          LEARNING_FOCUS_VISIBLE,
        )}
      >
        {actionLabel}
      </button>
      {status ? (
        <p
          className={cn("mt-4 text-sm font-semibold", fitText.info)}
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
    </section>
  );
}
