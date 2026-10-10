// File purpose: Provides an accessible, bounded multi-ticker input for Community posts.
import * as React from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { FOCUS_VISIBLE, cn, communityUi, fitText, fitType } from "../design";
import {
  MAX_COMMUNITY_TICKERS,
  normalizeCommunityTickers,
  parseCommunityTickerInput,
  validateCommunityTickers,
} from "../lib/communityTickers";
import communityStyles from "../styles/community.module.css";

export function CommunityTickerField({
  disabled,
  input,
  onInputChange,
  onTickersChange,
  suggestedTickers,
  tickers,
}: {
  disabled: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onTickersChange: (tickers: string[]) => void;
  suggestedTickers: string[];
  tickers: string[];
}) {
  const [error, setError] = React.useState<string | null>(null);
  const normalizedTickers = normalizeCommunityTickers(tickers);
  const atLimit = normalizedTickers.length >= MAX_COMMUNITY_TICKERS;
  const helpId = React.useId();
  const errorId = React.useId();

  function addTickerValues(value: string, clearInput = true) {
    const candidates = value.split(/[\s,]+/).filter(Boolean);
    const validationError = validateCommunityTickers([
      ...normalizedTickers,
      ...candidates,
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextTickers = normalizeCommunityTickers([
      ...normalizedTickers,
      ...parseCommunityTickerInput(value),
    ]);
    setError(null);
    onTickersChange(nextTickers);
    if (clearInput) onInputChange("");
  }

  const availableSuggestions = normalizeCommunityTickers(suggestedTickers)
    .filter((ticker) => !normalizedTickers.includes(ticker))
    .slice(0, Math.max(0, MAX_COMMUNITY_TICKERS - normalizedTickers.length));

  return (
    <fieldset className="min-w-0 md:col-span-2 xl:col-span-1">
      <legend className={cn(fitType.eyebrow, fitText.label)}>
        Tickers (optional)
      </legend>

      {normalizedTickers.length ? (
        <ul className="mt-1 flex min-h-8 flex-wrap gap-1.5" aria-label="Selected tickers">
          {normalizedTickers.map((ticker, index) => (
            <li
              key={ticker}
              className={cn(
                "inline-flex min-w-0 items-center gap-1 rounded-md border border-[#2c5d4a]/70 bg-[#0c1c17] px-2 py-1 text-[#9ff0c8]",
                fitType.badge,
              )}
            >
              <span className={communityStyles.wrapAnywhere}>${ticker}</span>
              {index === 0 ? (
                <span className="rounded bg-white/[0.07] px-1 text-[#b8c2d4]">
                  Primary
                </span>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${ticker} ticker`}
                onClick={() =>
                  onTickersChange(
                    normalizedTickers.filter((item) => item !== ticker),
                  )
                }
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded text-[#7fbca8] hover:bg-white/[0.08] hover:text-white",
                  FOCUS_VISIBLE,
                )}
              >
                <CloseRoundedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-1 flex min-w-0 gap-2">
        <input
          type="text"
          autoComplete="off"
          value={input}
          disabled={disabled || atLimit}
          aria-invalid={Boolean(error)}
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
          onChange={(event) => {
            setError(null);
            onInputChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (input.trim() && !atLimit) addTickerValues(input);
          }}
          className={cn(
            "h-10 min-w-0 flex-1 px-3 normal-case",
            communityUi.field,
            communityStyles.inputBorder,
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          placeholder="NVDA, NFLX"
        />
        <button
          type="button"
          disabled={disabled || atLimit || !input.trim()}
          aria-label="Add ticker"
          onClick={() => addTickerValues(input)}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-[#343846] bg-[#171923] px-3 text-[#c7cfdf] hover:border-[#4a5266] hover:text-white disabled:cursor-not-allowed disabled:opacity-45",
            fitType.control,
            FOCUS_VISIBLE,
          )}
        >
          <AddRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p id={helpId} className={cn(fitType.caption, fitText.label)}>
          <span>{normalizedTickers.length}/{MAX_COMMUNITY_TICKERS} tickers selected</span>
          {normalizedTickers.length ? " · First ticker is primary." : ""}
        </p>
        {availableSuggestions.map((ticker) => (
          <button
            key={ticker}
            type="button"
            disabled={disabled || atLimit}
            onClick={() => addTickerValues(ticker, false)}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[#8fa1ff] hover:bg-white/[0.04] hover:text-[#cbd4ff]",
              fitType.caption,
              FOCUS_VISIBLE,
            )}
          >
            Add ${ticker}
          </button>
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className={cn("mt-1 text-[#ff9eb3]", fitType.caption)}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
