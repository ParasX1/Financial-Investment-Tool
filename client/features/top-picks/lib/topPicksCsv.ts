import type { TopPicksColumnDef, TopPicksRow, TopPicksSortKey } from "../types";

const SPREADSHEET_FORMULA_PATTERN = /^\s*[=+\-@]/;

const neutralizeSpreadsheetFormula = (value: string): string =>
  SPREADSHEET_FORMULA_PATTERN.test(value) ? `'${value}` : value;

const escapeCsvValue = (value: unknown, protectText = false) => {
  const text = String(value);
  const safeText = protectText ? neutralizeSpreadsheetFormula(text) : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

export const buildTopPicksCsv = (
  rows: TopPicksRow[],
  columns: TopPicksColumnDef[],
  rankOffset = 0,
): string => {
  const header = columns
    .map((column) => escapeCsvValue(column.label))
    .join(",");
  const body = rows
    .map((row, index) =>
      columns
        .map((column) => {
          if (column.key === "rank") {
            return escapeCsvValue(rankOffset + index + 1);
          }
          const rawValue = row[column.key];
          const status = column.format
            ? row.metricStatus?.[column.key as TopPicksSortKey]
            : undefined;
          const metricValue =
            (!status || status === "ok") &&
            typeof rawValue === "number" &&
            Number.isFinite(rawValue)
              ? rawValue
              : null;
          const formattedValue =
            column.format?.(metricValue, status) ?? rawValue ?? "—";
          return escapeCsvValue(
            formattedValue,
            !column.format && typeof rawValue === "string",
          );
        })
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
};
