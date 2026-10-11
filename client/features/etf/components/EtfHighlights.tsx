import { Box, Stack, Typography } from "@mui/material";

export type EtfHighlight = {
  label: string;
  symbol?: string;
  value: string;
};

export function EtfHighlights({ items }: { items: readonly EtfHighlight[] }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      gap={1.5}
      sx={{ mb: 2.5 }}
      aria-label="ETF preview highlights"
    >
      {items.map(({ label, symbol, value }) => (
        <Box
          key={label}
          sx={{
            flex: 1,
            border: "1px solid var(--fit-color-border-subtle)",
            borderRadius: "var(--fit-radius-panel)",
            bgcolor: "var(--fit-color-surface)",
            px: 2.25,
            py: 2,
          }}
        >
          <Typography
            component="h2"
            sx={{
              color: "var(--fit-color-text-label)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              mb: 0.75,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              color: "var(--fit-color-text-strong)",
              fontSize: "1.25rem",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {symbol}{" "}
            <Box component="span" sx={{ color: "var(--fit-color-accent)" }}>
              {value}
            </Box>
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
