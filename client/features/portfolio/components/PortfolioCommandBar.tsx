import React from "react";
import type { PortfolioAnalysisInputs } from "../types";
import { PortfolioSymbolInput } from "./PortfolioSymbolInput";
import styles from "../styles/PortfolioCommandBar.module.css";

const dateMonthsAgo = (today: string, months: number) => {
  const [year, month, day] = today.split("-").map(Number);
  const targetMonthIndex = year * 12 + (month - 1) - months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(
    targetDay,
  ).padStart(2, "0")}`;
};

const dateYearsAgo = (today: string, years: number) => {
  return dateMonthsAgo(today, years * 12);
};

const presets = [
  { label: "3M", start: (today: string) => dateMonthsAgo(today, 3) },
  { label: "6M", start: (today: string) => dateMonthsAgo(today, 6) },
  { label: "YTD", start: (today: string) => `${today.slice(0, 4)}-01-01` },
  { label: "1Y", start: (today: string) => dateYearsAgo(today, 1) },
  { label: "3Y", start: (today: string) => dateYearsAgo(today, 3) },
  { label: "5Y", start: (today: string) => dateYearsAgo(today, 5) },
];

export const PortfolioCommandBar = ({
  symbols,
  symbolOptions,
  inputs,
  today,
  pending,
  validationError,
  onSymbolsChange,
  onInputsChange,
  onApply,
}: {
  symbols: string[];
  symbolOptions: string[];
  inputs: PortfolioAnalysisInputs;
  today: string;
  pending: boolean;
  validationError: string | null;
  onSymbolsChange: (symbols: string[]) => void;
  onInputsChange: (inputs: PortfolioAnalysisInputs) => void;
  onApply: () => void;
}) => {
  const patchInputs = (patch: Partial<PortfolioAnalysisInputs>) =>
    onInputsChange({ ...inputs, ...patch });

  return (
    <section className={styles.commandBar} aria-label="Portfolio command bar">
      <div className={styles.commandPrimary}>
        <PortfolioSymbolInput
          symbols={symbols}
          symbolOptions={symbolOptions}
          onSymbolsChange={onSymbolsChange}
        />

        <div className={styles.commandRange}>
          <div className={styles.controlLabelRow}>
            <span>Linked history</span>
            <span>Applied to linked cards</span>
          </div>
          <div className={styles.presetRow} aria-label="Date range presets">
            {presets.map((preset) => {
              const start = preset.start(today);
              const active =
                inputs.startDate === start && inputs.endDate === today;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={active ? styles.presetActive : styles.preset}
                  aria-pressed={active}
                  onClick={() =>
                    patchInputs({ startDate: start, endDate: today })
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className={styles.runButton}
          onClick={onApply}
          disabled={!pending || Boolean(validationError)}
        >
          {pending ? "Run analysis" : "Analysis current"}
        </button>
      </div>

      <div className={styles.commandSecondary}>
        <div
          className={styles.inlineAssumptions}
          aria-label="Model assumptions"
        >
          <label htmlFor="portfolio-benchmark">
            <span>Benchmark</span>
            <input
              id="portfolio-benchmark"
              value={inputs.benchmark}
              maxLength={15}
              onChange={(event) =>
                patchInputs({
                  benchmark: event.target.value.toUpperCase(),
                })
              }
            />
          </label>
          <label htmlFor="portfolio-risk-free-rate">
            <span>Risk-free %</span>
            <input
              id="portfolio-risk-free-rate"
              type="number"
              min="-20"
              max="50"
              step="0.1"
              value={Number((inputs.riskFreeRate * 100).toFixed(2))}
              onChange={(event) =>
                patchInputs({
                  riskFreeRate: Number(event.target.value) / 100,
                })
              }
            />
          </label>
          <label htmlFor="portfolio-confidence">
            <span>VaR confidence</span>
            <select
              id="portfolio-confidence"
              value={inputs.confidenceLevel}
              onChange={(event) =>
                patchInputs({
                  confidenceLevel: Number(event.target.value),
                })
              }
            >
              <option value={0.1}>90%</option>
              <option value={0.05}>95%</option>
              <option value={0.01}>99%</option>
            </select>
          </label>
        </div>

        <div className={styles.dateRow}>
          <label htmlFor="portfolio-start-date">
            <span>From</span>
            <input
              id="portfolio-start-date"
              type="date"
              value={inputs.startDate}
              max={today}
              onChange={(event) =>
                patchInputs({ startDate: event.target.value })
              }
            />
          </label>
          <span aria-hidden="true">to</span>
          <label htmlFor="portfolio-end-date">
            <span>To</span>
            <input
              id="portfolio-end-date"
              type="date"
              value={inputs.endDate}
              max={today}
              onChange={(event) => patchInputs({ endDate: event.target.value })}
            />
          </label>
        </div>
      </div>

      <div className={styles.commandFooter}>
        <p
          className={
            validationError ? styles.validationError : styles.commandHint
          }
          role={validationError ? "alert" : undefined}
        >
          {validationError ??
            (pending
              ? "Draft changes are pending. Click Run analysis to update the charts; current charts still use the previous analysis."
              : "Historical adjusted-close research, not live market data")}
        </p>
      </div>
    </section>
  );
};
