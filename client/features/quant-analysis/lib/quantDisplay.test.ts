import type { QuantEvidence } from "../types";
import { formatEvidenceValue } from "./quantDisplay";

const evidence = (unit: string, value = 0.1234): QuantEvidence => ({
  key: `metric-${unit}`,
  label: unit,
  value,
  unit,
  finite: true,
  warnings: [],
});

describe("formatEvidenceValue", () => {
  it.each([
    "decimal_return",
    "decimal_annualized",
    "decimal_drawdown",
    "fraction",
    "decimal_distance",
    "ratio",
    "percent",
    "percentage",
  ])("formats %s evidence as a percentage", (unit) => {
    expect(formatEvidenceValue(evidence(unit))).toBe("12.3%");
  });

  it.each(["observations", "count"])(
    "formats %s evidence as a rounded count",
    (unit) => {
      expect(formatEvidenceValue(evidence(unit, 1234.4))).toBe(
        (1234).toLocaleString(),
      );
    },
  );

  it("retains the unit for other finite evidence", () => {
    expect(formatEvidenceValue(evidence("days", 12.3456))).toBe("12.346 days");
  });
});
