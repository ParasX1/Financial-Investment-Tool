import re

import pandas as pd


TICKER_PATTERN = re.compile(r"^[A-Z0-9^][A-Z0-9.^=-]{0,14}$")

__all__ = [
    "TICKER_PATTERN",
    "calculate_returns",
    "get_adjusted_close_prices",
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


def _find_price_field(labels):
    normalized_labels = {
        str(label).strip().casefold(): label for label in labels
    }
    for candidate in ("Adj Close", "Close"):
        matched_label = normalized_labels.get(candidate.casefold())
        if matched_label is not None:
            return matched_label
    return None


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

    price_data = price_data.apply(pd.to_numeric, errors="coerce")
    return price_data.dropna(axis=1, how="all")


def get_adjusted_close_prices(data, requested_tickers=None):
    if data is None or data.empty:
        return pd.DataFrame()

    if isinstance(data.columns, pd.MultiIndex):
        for level in range(data.columns.nlevels):
            field = _find_price_field(data.columns.get_level_values(level))
            if field is not None:
                try:
                    price_data = data.xs(field, level=level, axis=1)
                except (KeyError, ValueError):
                    continue
                return _normalize_price_frame(
                    price_data,
                    requested_tickers,
                )
        return pd.DataFrame(index=data.index)

    field = _find_price_field(data.columns)
    if field is not None:
        return _normalize_price_frame(data[field], requested_tickers)

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
    )


def calculate_returns(price_frame):
    if price_frame.empty:
        return pd.DataFrame(index=price_frame.index)

    return price_frame.pct_change(fill_method=None).dropna(how="all")
