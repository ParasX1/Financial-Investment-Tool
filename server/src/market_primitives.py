import re
from numbers import Real

import numpy as np
import pandas as pd


TICKER_PATTERN = re.compile(r"^[A-Z0-9^][A-Z0-9.^=-]{0,14}$")
# This policy also versions derived snapshots and exported seed calculations.
CALCULATION_VERSION = 2

__all__ = [
    "TICKER_PATTERN",
    "calculate_returns",
    "clean_prices",
    "get_adjusted_close_prices",
    "has_finite_correlation",
    "normalize_tickers",
]


def normalize_tickers(stock_tickers):
    if isinstance(stock_tickers, str):
        stock_tickers = [stock_tickers]

    cleaned_tickers = (
        str(ticker).strip().upper() for ticker in stock_tickers
    )
    return list(dict.fromkeys(
        ticker for ticker in cleaned_tickers if ticker
    ))


def has_finite_correlation(row):
    """Keep real matrix coefficients, including a valid self-correlation."""
    if not isinstance(row, dict):
        return False
    for value in row.values():
        if isinstance(value, Real) and not isinstance(value, bool) and np.isfinite(value):
            return True
    return False


def _find_price_field(labels, candidate):
    normalized_labels = {
        str(label).strip().casefold(): label for label in labels
    }
    return normalized_labels.get(candidate.casefold())


def clean_prices(price_data):
    """Keep the supplied index; only finite, positive numeric prices are usable."""
    numeric = (price_data.apply(pd.to_numeric, errors="coerce")
               if isinstance(price_data, pd.DataFrame)
               else pd.to_numeric(price_data, errors="coerce"))
    return numeric.where(np.isfinite(numeric) & (numeric > 0))


def _normalize_price_frame(price_data, requested_tickers):
    if isinstance(price_data, pd.Series):
        price_data = price_data.to_frame()
    else:
        price_data = price_data.copy()

    normalized_tickers = normalize_tickers(requested_tickers or [])
    if len(normalized_tickers) == 1 and price_data.shape[1] == 1:
        price_data.columns = [normalized_tickers[0]]
    elif not isinstance(price_data.columns, pd.MultiIndex):
        price_data.columns = [
            str(column).strip().upper()
            for column in price_data.columns
        ]

    return clean_prices(price_data)


def _select_price_fields(adjusted, close):
    """Choose one price basis per symbol, never fill adjusted gaps from Close."""
    adjusted = adjusted.dropna(axis=1, how="all")
    fallback = close.loc[:, ~close.columns.isin(adjusted.columns)]
    return pd.concat([adjusted, fallback], axis=1).dropna(axis=1, how="all")


def get_adjusted_close_prices(data, requested_tickers=None):
    if data is None or data.empty:
        return pd.DataFrame()

    if isinstance(data.columns, pd.MultiIndex):
        for level in range(data.columns.nlevels):
            fields = {}
            for candidate in ("Adj Close", "Close"):
                field = _find_price_field(data.columns.get_level_values(level), candidate)
                fields[candidate] = (
                    _normalize_price_frame(data.xs(field, level=level, axis=1), requested_tickers)
                    if field is not None else pd.DataFrame(index=data.index)
                )
            if any(not frame.empty for frame in fields.values()):
                return _select_price_fields(fields["Adj Close"], fields["Close"])
        return pd.DataFrame(index=data.index)

    fields = {}
    for candidate in ("Adj Close", "Close"):
        field = _find_price_field(data.columns, candidate)
        fields[candidate] = (
            _normalize_price_frame(data[field], requested_tickers)
            if field is not None else pd.DataFrame(index=data.index)
        )
    if any(not frame.empty for frame in fields.values()):
        return _select_price_fields(fields["Adj Close"], fields["Close"])

    normalized_tickers = normalize_tickers(requested_tickers or [])
    columns_by_ticker = {
        str(column).strip().upper(): column for column in data.columns
    }
    available_columns = [
        columns_by_ticker[ticker]
        for ticker in normalized_tickers
        if ticker in columns_by_ticker
    ]
    if not available_columns:
        return pd.DataFrame(index=data.index)

    return _normalize_price_frame(
        data.loc[:, available_columns],
        normalized_tickers,
    ).dropna(axis=1, how="all")


def calculate_returns(price_frame):
    """Adjacent supplied observations only; missing endpoints stay missing.

    No exchange calendar is inferred. A date omitted from the entire input does
    not create a row, while an explicitly missing price invalidates both pairs.
    """
    if price_frame.empty:
        return pd.DataFrame(index=price_frame.index)

    with np.errstate(over="ignore", divide="ignore", invalid="ignore"):
        returns = clean_prices(price_frame).pct_change(fill_method=None)
    return returns.where(np.isfinite(returns))
