import React from "react";
import { Autocomplete, Chip, TextField } from "@mui/material";
import { METRIC_REGISTRY } from "../data/metricRegistry";
import type { PortfolioAnalysisSettings } from "../types";
import styles from "../styles/PortfolioScreen.module.css";

type PortfolioControlsProps = {
  symbols: string[];
  symbolOptions: string[];
  settings: PortfolioAnalysisSettings;
  today: string;
  validationError: string | null;
  onSymbolsChange: (symbols: string[]) => void;
  onSettingsChange: (settings: PortfolioAnalysisSettings) => void;
};

const normaliseSymbols = (values: string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim().toUpperCase())
        .filter((value) => /^[A-Z0-9.-]{1,12}$/.test(value)),
    ),
  ).slice(0, 5);

const dateYearsAgo = (today: string, years: number) => {
  const date = new Date(`${today}T12:00:00`);
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
};

const dateMonthsAgo = (today: string, months: number) => {
  const date = new Date(`${today}T12:00:00`);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
};

const dateAtStartOfYear = (today: string) => `${today.slice(0, 4)}-01-01`;

const presets = [
  { label: "3M", start: (today: string) => dateMonthsAgo(today, 3) },
  { label: "6M", start: (today: string) => dateMonthsAgo(today, 6) },
  { label: "YTD", start: dateAtStartOfYear },
  { label: "1Y", start: (today: string) => dateYearsAgo(today, 1) },
  { label: "3Y", start: (today: string) => dateYearsAgo(today, 3) },
  { label: "5Y", start: (today: string) => dateYearsAgo(today, 5) },
];

export const PortfolioControls = ({
  symbols,
  symbolOptions,
  settings,
  today,
  validationError,
  onSymbolsChange,
  onSettingsChange,
}: PortfolioControlsProps) => {
  const metric = METRIC_REGISTRY[settings.metricType];
  const updateSettings = (patch: Partial<PortfolioAnalysisSettings>) =>
    onSettingsChange({ ...settings, ...patch });

  return (
    <section className={styles.builder} aria-label="Portfolio analysis inputs">
      <div className={styles.symbolField}>
        <div className={styles.controlLabelRow}>
          <label htmlFor="portfolio-stock-select">Analysis universe</label>
          <span>{symbols.length}/5 selected</span>
        </div>
        <Autocomplete
          id="portfolio-stock-select"
          multiple
          freeSolo
          options={symbolOptions}
          value={symbols}
          filterSelectedOptions
          onChange={(_, nextSymbols) =>
            onSymbolsChange(normaliseSymbols(nextSymbols.map(String)))
          }
          renderTags={(value, getTagProps) =>
            value.map((symbol, index) => (
              <Chip
                {...getTagProps({ index })}
                key={symbol}
                label={symbol}
                size="small"
                className={styles.symbolChip}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                symbols.length === 5
                  ? "Five-stock limit reached"
                  : "Add AAPL, MSFT, CBA.AX…"
              }
              inputProps={{
                ...params.inputProps,
                "aria-describedby": "portfolio-symbol-hint",
              }}
            />
          )}
          sx={{
            "& .MuiOutlinedInput-root": {
              minHeight: 48,
              color: "#f7f8fc",
              background: "rgba(8, 12, 20, 0.72)",
              borderRadius: "12px",
              "& fieldset": { borderColor: "rgba(143, 164, 196, 0.22)" },
              "&:hover fieldset": { borderColor: "rgba(101, 160, 253, 0.58)" },
              "&.Mui-focused fieldset": { borderColor: "#65a0fd" },
            },
            "& input": { color: "#f7f8fc" },
          }}
        />
        <p id="portfolio-symbol-hint" className={styles.fieldHint}>
          Symbols shown here are included in every comparison.
        </p>
      </div>

      <div className={styles.rangeField}>
        <div className={styles.controlLabelRow}>
          <span>History range</span>
          <span>Default 1 year</span>
        </div>
        <div className={styles.presetRow} aria-label="Date range presets">
          {presets.map((preset) => {
            const presetStart = preset.start(today);
            const isActive =
              settings.startDate === presetStart && settings.endDate === today;

            return (
              <button
                key={preset.label}
                type="button"
                className={isActive ? styles.presetActive : styles.preset}
                aria-pressed={isActive}
                onClick={() =>
                  updateSettings({
                    startDate: presetStart,
                    endDate: today,
                  })
                }
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className={styles.dateRow}>
          <label htmlFor="portfolio-start-date">
            <span>From</span>
            <input
              id="portfolio-start-date"
              type="date"
              value={settings.startDate}
              max={today}
              onChange={(event) =>
                updateSettings({ startDate: event.target.value })
              }
            />
          </label>
          <span aria-hidden="true">→</span>
          <label htmlFor="portfolio-end-date">
            <span>To</span>
            <input
              id="portfolio-end-date"
              type="date"
              value={settings.endDate}
              max={today}
              onChange={(event) =>
                updateSettings({ endDate: event.target.value })
              }
            />
          </label>
        </div>
        {validationError ? (
          <p className={styles.validationError} role="alert">
            {validationError}
          </p>
        ) : (
          <p className={styles.fieldHint}>
            Trading history is aligned across available symbols.
          </p>
        )}
      </div>

      <details className={styles.assumptions}>
        <summary>Model inputs</summary>
        <div className={styles.assumptionGrid}>
          {metric.requiresBenchmark && (
            <label htmlFor="portfolio-benchmark">
              <span>Benchmark</span>
              <input
                id="portfolio-benchmark"
                value={settings.benchmark}
                maxLength={12}
                onChange={(event) =>
                  updateSettings({
                    benchmark: event.target.value.toUpperCase(),
                  })
                }
              />
            </label>
          )}
          {metric.usesRiskFreeRate && (
            <label htmlFor="portfolio-risk-free-rate">
              <span>Risk-free rate (%)</span>
              <input
                id="portfolio-risk-free-rate"
                type="number"
                min="-20"
                max="50"
                step="0.1"
                value={Number((settings.riskFreeRate * 100).toFixed(2))}
                onChange={(event) =>
                  updateSettings({
                    riskFreeRate: Number(event.target.value) / 100,
                  })
                }
              />
            </label>
          )}
          {metric.usesConfidenceLevel && (
            <label htmlFor="portfolio-confidence">
              <span>VaR confidence</span>
              <select
                id="portfolio-confidence"
                value={settings.confidenceLevel}
                onChange={(event) =>
                  updateSettings({
                    confidenceLevel: Number(event.target.value),
                  })
                }
              >
                <option value={0.1}>90%</option>
                <option value={0.05}>95%</option>
                <option value={0.01}>99%</option>
              </select>
            </label>
          )}
          {!metric.requiresBenchmark &&
            !metric.usesRiskFreeRate &&
            !metric.usesConfidenceLevel && (
              <p>This metric has no additional model inputs.</p>
            )}
        </div>
      </details>
    </section>
  );
};
