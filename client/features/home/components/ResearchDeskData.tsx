import {
  formatResearchValue,
  researchMetricDefinitions,
  researchPeriod,
  researchSample,
  type ResearchMetric,
} from "../data/researchDesk";
import styles from "../styles/ResearchDesk.module.css";

export function ResearchMetricFigures({ kind }: { kind: ResearchMetric }) {
  const definition = researchMetricDefinitions[kind];
  return (
    <dl className={styles.figures} aria-label={definition.summaryLabel}>
      {researchSample.companies.map((company) => (
        <div key={company.symbol}>
          <dt>{company.symbol}</dt>
          <dd>{formatResearchValue(kind, company[definition.valueKey])}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ResearchMethodAndData({ kind }: { kind: ResearchMetric }) {
  const definition = researchMetricDefinitions[kind];
  return (
    <details className={styles.dataDetails}>
      <summary>Method and sample data</summary>
      <p>{definition.metric.method}</p>
      <p>{definition.context}</p>
      <p className={styles.tableNote}>Percentages, rounded for display.</p>
      <div
        className={styles.tableScroll}
        role="region"
        aria-label={`${definition.metric.label} data table`}
        tabIndex={0}
      >
        <table>
          <caption>{definition.metric.label} sample data</caption>
          <thead>
            <tr>
              <th scope="col">{kind === "volatility" ? "Period" : "Date"}</th>
              {researchSample.companies.map((company) => (
                <th scope="col" key={company.symbol}>
                  {company.name} ({company.symbol})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kind === "volatility" ? (
              <tr>
                <th scope="row">{researchPeriod}</th>
                {researchSample.companies.map((company) => (
                  <td key={company.symbol}>
                    <data value={company.annualisedVolatility}>
                      {formatResearchValue(kind, company.annualisedVolatility)}
                    </data>
                  </td>
                ))}
              </tr>
            ) : (
              researchSample.dates.map((date, index) => (
                <tr key={date}>
                  <th scope="row">
                    <time dateTime={date}>{date}</time>
                  </th>
                  {researchSample.companies.map((company) => {
                    const value =
                      company[
                        kind === "return" ? "cumulativeReturn" : "drawdown"
                      ][index];
                    return (
                      <td key={company.symbol}>
                        <data value={value}>
                          {formatResearchValue(kind, value)}
                        </data>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}
