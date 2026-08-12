import type {
  QuantCapabilities,
  QuantFormErrors,
  QuantInterval,
  QuantObjective,
  QuantPeriod,
  QuantRiskProfile,
  QuantRunForm,
} from "../types";
import {
  OBJECTIVE_LABELS,
  PERIOD_LABELS,
  RISK_PROFILE_LABELS,
} from "../lib/quantDisplay";
import styles from "../styles/quantAnalysisStyles";

type ResearchSetupProps = {
  capabilities: QuantCapabilities;
  errors: QuantFormErrors;
  form: QuantRunForm;
  running: boolean;
  onChange: <Key extends keyof QuantRunForm>(
    key: Key,
    value: QuantRunForm[Key],
  ) => void;
  onSubmit: () => Promise<boolean>;
};

export function ResearchSetup({
  capabilities,
  errors,
  form,
  running,
  onChange,
  onSubmit,
}: ResearchSetupProps) {
  const provider = capabilities.providers.find((candidate) => candidate.enabled);
  const maximumLength = capabilities.limits.maxSymbolLength;
  return (
    <section className={styles.panel} aria-labelledby="research-setup-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Bounded inputs</p>
          <h2 id="research-setup-title" className={styles.panelTitle}>
            Research Setup
          </h2>
        </div>
        <span className={styles.sequenceBadge}>01</span>
      </div>

      <form
        className={styles.setupForm}
        data-testid="research-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
        noValidate
      >
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="quant-symbol">
            Primary symbol
          </label>
          <input
            id="quant-symbol"
            className={styles.textField}
            value={form.symbol}
            maxLength={maximumLength}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.symbol)}
            aria-describedby={`quant-symbol-help${errors.symbol ? " quant-symbol-error" : ""}`}
            onChange={(event) => onChange("symbol", event.target.value)}
          />
          <p id="quant-symbol-help" className={styles.fieldHelp}>
            One listed instrument, for example BHP.AX or AAPL.
          </p>
          {errors.symbol ? (
            <p id="quant-symbol-error" className={styles.fieldError} role="alert">
              {errors.symbol}
            </p>
          ) : null}
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="quant-benchmark">
            Benchmark
          </label>
          <input
            id="quant-benchmark"
            className={styles.textField}
            value={form.benchmark}
            maxLength={maximumLength}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.benchmark)}
            aria-describedby={`quant-benchmark-help${
              errors.benchmark ? " quant-benchmark-error" : ""
            }`}
            onChange={(event) => onChange("benchmark", event.target.value)}
          />
          <p id="quant-benchmark-help" className={styles.fieldHelp}>
            Relative evidence is measured against this reference.
          </p>
          {errors.benchmark ? (
            <p id="quant-benchmark-error" className={styles.fieldError} role="alert">
              {errors.benchmark}
            </p>
          ) : null}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="quant-period">
              Observation window
            </label>
            <select
              id="quant-period"
              className={styles.selectField}
              value={form.period}
              onChange={(event) => onChange("period", event.target.value as QuantPeriod)}
            >
              {capabilities.periods.map((period) => (
                <option key={period} value={period}>
                  {PERIOD_LABELS[period]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="quant-interval">
              Interval
            </label>
            <select
              id="quant-interval"
              className={styles.selectField}
              value={form.interval}
              onChange={(event) =>
                onChange("interval", event.target.value as QuantInterval)
              }
            >
              {capabilities.intervals.map((interval) => (
                <option key={interval} value={interval}>
                  {interval === "1d" ? "Daily" : interval}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className={styles.choiceGroup}>
          <legend className={styles.fieldLabel}>Research objective</legend>
          <div className={styles.choiceGrid}>
            {capabilities.objectives.map((objective) => (
              <label key={objective} className={styles.choiceCard}>
                <input
                  type="radio"
                  name="quant-objective"
                  value={objective}
                  checked={form.objective === objective}
                  onChange={() => onChange("objective", objective as QuantObjective)}
                />
                <span>{OBJECTIVE_LABELS[objective]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="quant-risk-profile">
            Risk posture
          </label>
          <select
            id="quant-risk-profile"
            className={styles.selectField}
            value={form.riskProfile}
            onChange={(event) =>
              onChange("riskProfile", event.target.value as QuantRiskProfile)
            }
          >
            {capabilities.riskProfiles.map((riskProfile) => (
              <option key={riskProfile} value={riskProfile}>
                {RISK_PROFILE_LABELS[riskProfile]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.providerNote}>
          <span className={styles.providerPulse} aria-hidden="true" />
          <span>
            {provider?.label ?? "No provider enabled"}
            {provider ? ` · ${provider.version}` : ""}
          </span>
        </div>

        <button
          type="submit"
          className={styles.primaryButton}
          data-testid="run-study"
          disabled={running || !provider}
        >
          {running ? "Running study…" : "Run study"}
        </button>
        <p className={styles.disclaimer}>
          Research commentary only. This workbench does not place trades or promise returns.
        </p>
      </form>
    </section>
  );
}
