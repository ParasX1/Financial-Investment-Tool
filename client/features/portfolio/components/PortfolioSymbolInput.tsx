import React from "react";
import { Autocomplete, Chip, Popper, TextField } from "@mui/material";
import type { PopperProps } from "@mui/material/Popper";
import {
  usePortfolioSymbolSearch,
  type PortfolioSymbolSearchResult,
} from "../hooks/usePortfolioSymbolSearch";
import styles from "../styles/PortfolioCommandBar.module.css";

const TICKER_PATTERN = /^[A-Z0-9^][A-Z0-9.^=-]{0,14}$/;
const TICKER_FORMAT_MESSAGE =
  "Invalid ticker format. Use 1-15 characters. Start with A-Z, 0-9, or ^; then use A-Z, 0-9, ., ^, =, or -. Examples: AAPL, BRK-B, CBA.AX, ^GSPC, BTC-USD.";

export const normalisePortfolioSymbols = (values: string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim().toUpperCase())
        .filter((value) => TICKER_PATTERN.test(value)),
    ),
  ).slice(0, 5);

export const hasInvalidPortfolioSymbols = (values: string[]) =>
  values
    .map((value) => value.trim().toUpperCase())
    .some((value) => value && !TICKER_PATTERN.test(value));

const showTickerFormatWarning = () => {
  globalThis.alert?.(TICKER_FORMAT_MESSAGE);
};

const SymbolOptionsPopper = (props: PopperProps) => (
  <Popper
    {...props}
    placement="bottom-start"
    style={{
      ...props.style,
      width:
        props.anchorEl instanceof HTMLElement
          ? props.anchorEl.clientWidth
          : undefined,
    }}
  />
);

type SymbolOption = string | PortfolioSymbolSearchResult;

const getOptionSymbol = (option: SymbolOption) =>
  typeof option === "string" ? option : option.symbol;

export const PortfolioSymbolInput = ({
  symbols,
  symbolOptions,
  onSymbolsChange,
}: {
  symbols: string[];
  symbolOptions: string[];
  onSymbolsChange: (symbols: string[]) => void;
}) => {
  const [symbolInput, setSymbolInput] = React.useState("");
  const [symbolPickerOpen, setSymbolPickerOpen] = React.useState(false);
  const symbolSearch = usePortfolioSymbolSearch(symbolInput);
  const searchActive = Boolean(symbolInput.trim());
  const options: SymbolOption[] = searchActive
    ? symbolSearch.results
    : symbolOptions;

  const updateSymbols = (values: SymbolOption[]) => {
    const nextValues = values.map(getOptionSymbol);
    if (hasInvalidPortfolioSymbols(nextValues)) {
      showTickerFormatWarning();
    }
    onSymbolsChange(normalisePortfolioSymbols(nextValues));
    setSymbolInput("");
    setSymbolPickerOpen(false);
  };

  const commitSymbolInput = (value: string, warnOnInvalid = true) => {
    if (hasInvalidPortfolioSymbols([value])) {
      if (warnOnInvalid) {
        showTickerFormatWarning();
      }
      setSymbolPickerOpen(false);
      return;
    }
    const nextSymbols = normalisePortfolioSymbols([...symbols, value]);
    if (nextSymbols.length !== symbols.length) {
      onSymbolsChange(nextSymbols);
    }
    setSymbolInput("");
    setSymbolPickerOpen(false);
  };

  const commitExactSearchResult = (value: string) => {
    const normalizedValue = value.trim().toUpperCase();
    const exactResult = symbolSearch.results.find(
      (result) => result.symbol === normalizedValue,
    );
    if (!exactResult) return false;
    commitSymbolInput(exactResult.symbol, false);
    return true;
  };

  return (
    <div className={styles.symbolField}>
      <div className={styles.controlLabelRow}>
        <label htmlFor="portfolio-stock-select">Shared universe</label>
        <span>{symbols.length}/5</span>
      </div>
      <Autocomplete
        id="portfolio-stock-select"
        multiple
        freeSolo
        disablePortal
        clearOnBlur
        openOnFocus={false}
        filterSelectedOptions
        PopperComponent={SymbolOptionsPopper}
        options={options}
        filterOptions={(nextOptions) => nextOptions}
        getOptionLabel={(option) => getOptionSymbol(option)}
        isOptionEqualToValue={(option, value) =>
          getOptionSymbol(option) === getOptionSymbol(value)
        }
        loading={symbolSearch.loading}
        loadingText="Searching..."
        noOptionsText={
          symbolSearch.error ??
          (symbolSearch.hasSearched
            ? "No matching market symbol found"
            : "Type to search")
        }
        open={symbolPickerOpen}
        value={symbols}
        inputValue={symbolInput}
        onClose={() => setSymbolPickerOpen(false)}
        onChange={(_, next) => updateSymbols(next as SymbolOption[])}
        onInputChange={(_, next, reason) => {
          if (reason === "reset") return;
          const value = next.toUpperCase();
          setSymbolInput(value);
          setSymbolPickerOpen(Boolean(value.trim()));
        }}
        onOpen={() => setSymbolPickerOpen(true)}
        componentsProps={{
          paper: {
            sx: {
              mt: "4px",
              color: "var(--fit-color-text-strong)",
              background: "var(--fit-color-surface)",
              border: "1px solid var(--fit-color-border-control)",
              borderRadius: "var(--fit-radius-control)",
              boxShadow: "0 18px 38px rgba(0, 0, 0, 0.42)",
            },
          },
          popper: {
            sx: {
              maxWidth: "100%",
              zIndex: 20,
            },
          },
        }}
        ListboxProps={{
          sx: {
            maxHeight: 260,
            py: "4px",
            "& .MuiAutocomplete-option": {
              minHeight: 44,
              px: "10px",
              fontSize: "var(--fit-type-size-body)",
              lineHeight: 1.4,
              "&.Mui-focused, &[aria-selected='true']": {
                background: "var(--fit-color-accent-soft)",
              },
              "&.Mui-focusVisible": {
                outline: "2px solid var(--fit-color-focus-ring)",
                outlineOffset: "-2px",
              },
              "& small": {
                color: "var(--fit-color-text-body)",
                fontSize: "var(--fit-type-size-body-sm)",
                overflowWrap: "anywhere",
              },
            },
          },
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const symbol = getOptionSymbol(option);
            return (
              <Chip
                {...getTagProps({ index })}
                key={symbol}
                label={symbol}
                title={symbol}
                size="small"
                className={styles.symbolChip}
              />
            );
          })
        }
        renderOption={(props, option) => {
          const symbol = getOptionSymbol(option);
          const detail =
            typeof option === "string"
              ? null
              : `${option.exchange ?? option.quoteType} - ${option.name}`;
          return (
            <li {...props} key={symbol}>
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                }}
              >
                <strong>{symbol}</strong>
                {detail ? <small>{detail}</small> : null}
              </span>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            inputProps={{
              ...params.inputProps,
              onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
                if (symbolSearch.results.length > 0) {
                  if (commitExactSearchResult(event.currentTarget.value)) {
                    event.currentTarget.value = "";
                  }
                  return;
                }
                commitSymbolInput(event.currentTarget.value);
                event.currentTarget.value = "";
              },
              onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter" && symbolSearch.results.length > 0) {
                  return;
                }
                if (event.key !== "Enter" && event.key !== "Tab") return;
                const value = event.currentTarget.value;
                if (!value.trim()) return;
                event.nativeEvent.stopImmediatePropagation?.();
                event.preventDefault();
                event.stopPropagation();
                commitSymbolInput(value, false);
                event.currentTarget.value = "";
                event.currentTarget.blur?.();
              },
            }}
            placeholder={
              symbols.length >= 5 ? "Five-symbol limit" : "Add ticker..."
            }
          />
        )}
        sx={{
          "& .MuiOutlinedInput-root": {
            minHeight: 38,
            color: "var(--fit-color-text-strong)",
            background: "var(--fit-color-field)",
            borderRadius: "var(--fit-radius-control)",
            paddingTop: "4px",
            paddingBottom: "4px",
            "& fieldset": {
              borderColor: "var(--fit-color-border-control)",
            },
            "&:hover fieldset": {
              borderColor: "var(--fit-color-accent)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "var(--fit-color-focus-ring)",
            },
          },
          "& .MuiAutocomplete-input": {
            padding: "0 2px !important",
          },
          "& .MuiChip-root": {
            margin: "2px 2px",
            width: "auto",
            maxWidth: "calc(100% - 4px)",
          },
          "& .MuiChip-label": {
            paddingLeft: "6px",
            paddingRight: "2px",
            fontSize: "var(--fit-type-size-body-sm)",
            lineHeight: 1.4,
          },
          "& .MuiChip-deleteIcon": {
            width: 18,
            height: 18,
            marginLeft: 1,
            marginRight: 2,
          },
          "& input": {
            color: "var(--fit-color-text-strong)",
            fontSize: "var(--fit-type-size-body)",
          },
        }}
      />
    </div>
  );
};
