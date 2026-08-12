from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime
import math

import pandas as pd


PERIOD_MONTHS = {
    "1mo": 1,
    "3mo": 3,
    "6mo": 6,
    "1y": 12,
    "2y": 24,
}


class MarketDataUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True)
class Observation:
    date: str
    adjusted_close: float


@dataclass(frozen=True)
class MarketDataSnapshot:
    source_name: str
    symbol: str
    benchmark: str
    requested_start_date: str
    requested_end_date: str
    symbol_observations: tuple[Observation, ...]
    benchmark_observations: tuple[Observation, ...]
    warnings: tuple[str, ...]


def _session_date(value):
    if isinstance(value, pd.Timestamp):
        value = value.date()
    elif isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return value.isoformat()
    if not isinstance(value, str):
        return None
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None
    return value if parsed.isoformat() == value else None


def _finite_positive(value):
    if isinstance(value, bool):
        return None
    try:
        normalized = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(normalized) or normalized <= 0:
        return None
    return normalized


def normalize_observations(rows, start_date, end_date):
    candidates_by_date = {}
    exclusions = {
        "duplicate": 0,
        "invalidDate": 0,
        "invalidPrice": 0,
        "outsideWindow": 0,
    }
    for raw_date, raw_price in rows:
        session_date = _session_date(raw_date)
        if session_date is None:
            exclusions["invalidDate"] += 1
            continue
        if not start_date <= session_date <= end_date:
            exclusions["outsideWindow"] += 1
            continue
        price = _finite_positive(raw_price)
        if price is None:
            exclusions["invalidPrice"] += 1
            continue
        candidates_by_date.setdefault(session_date, []).append(price)

    by_date = {}
    for session_date, candidates in candidates_by_date.items():
        unique_prices = set(candidates)
        if len(unique_prices) != 1:
            exclusions["duplicate"] += len(candidates)
            continue
        if len(candidates) > 1:
            exclusions["duplicate"] += len(candidates) - 1
        by_date[session_date] = candidates[0]

    observations = tuple(
        Observation(session_date, by_date[session_date])
        for session_date in sorted(by_date)
    )
    return observations, {
        key: value for key, value in exclusions.items() if value
    }


def _subtract_months(value, months):
    zero_based_month = value.year * 12 + value.month - 1 - months
    year, month_index = divmod(zero_based_month, 12)
    month = month_index + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _adjusted_close_frame(frame):
    if not isinstance(frame, pd.DataFrame) or frame.empty:
        return pd.DataFrame(index=getattr(frame, "index", None))
    if not isinstance(frame.columns, pd.MultiIndex):
        return pd.DataFrame(index=frame.index)

    for level in range(frame.columns.nlevels):
        labels = {
            str(label).strip().casefold(): label
            for label in frame.columns.get_level_values(level)
        }
        adjusted_close_label = labels.get("adj close")
        if adjusted_close_label is None:
            continue
        try:
            adjusted = frame.xs(
                adjusted_close_label,
                level=level,
                axis=1,
            )
        except (KeyError, ValueError):
            continue
        if isinstance(adjusted, pd.Series):
            adjusted = adjusted.to_frame()
        adjusted = adjusted.copy()
        adjusted.columns = [
            str(column).strip().upper() for column in adjusted.columns
        ]
        return adjusted
    return pd.DataFrame(index=frame.index)


def _exclusion_warnings(symbol, exclusions):
    labels = {
        "duplicate": "duplicate date",
        "invalidDate": "invalid date",
        "invalidPrice": "invalid price",
        "outsideWindow": "out-of-window",
    }
    warnings = []
    for key, label in labels.items():
        count = exclusions.get(key, 0)
        if count:
            noun = "observation" if count == 1 else "observations"
            warnings.append(
                f"{count} {label} {noun} were excluded for {symbol}."
            )
    return warnings


class YahooFinanceMarketDataAdapter:
    def __init__(self, fetcher=None, today_provider=date.today):
        if fetcher is None:
            from ..metrics import fetch_stock_data

            fetcher = fetch_stock_data
        self._fetcher = fetcher
        self._today_provider = today_provider

    def fetch(self, request):
        end = self._today_provider()
        start = _subtract_months(end, PERIOD_MONTHS[request.period])
        start_date = start.isoformat()
        end_date = end.isoformat()
        symbols = [request.symbol, request.benchmark]
        try:
            raw_frame = self._fetcher(symbols, start_date, end_date)
        except Exception as error:
            raise MarketDataUnavailableError(
                "The market data provider request failed."
            ) from error

        adjusted_close = _adjusted_close_frame(raw_frame)
        warnings = []
        normalized = {}
        for symbol in symbols:
            if symbol not in adjusted_close.columns:
                normalized[symbol] = ()
                warnings.append(
                    f"Adjusted close data is unavailable for {symbol}."
                )
                continue
            observations, exclusions = normalize_observations(
                adjusted_close[symbol].items(),
                start_date=start_date,
                end_date=end_date,
            )
            normalized[symbol] = observations
            warnings.extend(_exclusion_warnings(symbol, exclusions))
            if not observations:
                warnings.append(
                    f"Adjusted close data is unavailable for {symbol}."
                )

        return MarketDataSnapshot(
            source_name="Yahoo Finance adjusted close",
            symbol=request.symbol,
            benchmark=request.benchmark,
            requested_start_date=start_date,
            requested_end_date=end_date,
            symbol_observations=normalized[request.symbol],
            benchmark_observations=normalized[request.benchmark],
            warnings=tuple(dict.fromkeys(warnings)),
        )
