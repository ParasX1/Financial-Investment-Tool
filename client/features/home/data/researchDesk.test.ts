import sample from "./researchDeskSample.json";
import {
  formatResearchValue,
  researchCapturedOn,
  researchCompanyContext,
  researchLineData,
  researchMetricDefinitions,
  researchPeriod,
  researchVolatilityData,
} from "./researchDesk";

describe("Home research sample adapters", () => {
  it("retains every frozen observation and local calendar date without recalculating returns", () => {
    for (const kind of ["return", "drawdown"] as const) {
      researchLineData[kind].forEach((series, companyIndex) => {
        expect(series.ticker).toBe(sample.companies[companyIndex].symbol);
        expect(series.values.map(({ value }) => value)).toEqual(
          sample.companies[companyIndex][
            kind === "return" ? "cumulativeReturn" : "drawdown"
          ],
        );
        expect(
          series.values.map(
            ({ date }) =>
              `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
          ),
        ).toEqual(sample.dates);
      });
    }
    expect(researchVolatilityData).toEqual([
      { label: "AAPL", value: 0.21596731336116873 },
      { label: "MSFT", value: 0.17211387580726561 },
    ]);
  });

  it("uses shared financial labels, units and honest historical context", () => {
    expect(researchMetricDefinitions.return.metric.label).toBe(
      "Cumulative return",
    );
    expect(researchMetricDefinitions.volatility.metric.label).toBe(
      "Annualised volatility",
    );
    expect(researchMetricDefinitions.drawdown.metric.label).toBe(
      "Drawdown history",
    );
    expect(formatResearchValue("return", sample.companies[0].totalReturn)).toBe(
      "+4.59%",
    );
    expect(
      formatResearchValue(
        "volatility",
        sample.companies[0].annualisedVolatility,
      ),
    ).toBe("21.6%");
    expect(
      formatResearchValue("drawdown", sample.companies[0].maxDrawdown),
    ).toBe("-2.9%");
    expect(researchPeriod).toBe("3–30 Sep 2024");
    expect(researchCapturedOn).toBe("17 Oct 2026");
    expect(researchCompanyContext).toBe("Apple (AAPL) · Microsoft (MSFT)");
  });
});
