"""Shared Top Picks calculation settings, defaults and boundary validation."""

from datetime import date
import math

from ..market_primitives import TICKER_PATTERN
from .repository import MAX_TICKER_UNIVERSE


DEFAULT_BENCHMARK_TICKER = "^AXJO"
DEFAULT_RISK_FREE_RATE = 0.0435
DEFAULT_RISK_FREE_RATE_SOURCE = "RBA cash rate target"
DEFAULT_RISK_FREE_RATE_AS_OF = "2026-06-17"
DEFAULT_UNIVERSE_LIMIT = 1000
DEFAULT_CACHE_TTL_SECONDS = 600
DEFAULT_REFRESH_INTERVAL_SECONDS = 60
DEFAULT_STALE_CACHE_TTL_SECONDS = 86_400
MIN_TRAILING_RETURN_OBSERVATIONS = 200
WINDOW_METHODS = {
    "1D": "trailing_day",
    "1W": "trailing_week",
    "1M": "trailing_month",
    "1Y": "trailing_one_year",
}
TOP_PICKS_WINDOWS = ("1D", "1W", "1M", "1Y")
WINDOW_MIN_OBSERVATIONS = {
    "1D": {"ret1y": 1},
    "1W": {"ret1y": 2, "volatility": 3, "maxDD": 2},
    "1M": {"ret1y": 2, "volatility": 10, "maxDD": 2},
    "1Y": {},
}
WINDOW_PRICE_OBSERVATIONS = {
    "1D": 2,
    "1W": 6,
    "1M": 22,
}
METRIC_KEYS = (
    "ret1y",
    "sharpe",
    "sortino",
    "volatility",
    "maxDD",
    "beta",
    "alpha",
    "infoRatio",
)
METRIC_UNITS = {
    "ret1y": "decimal_return",
    "sharpe": "ratio",
    "sortino": "ratio",
    "volatility": "decimal_annualized",
    "maxDD": "decimal_drawdown",
    "beta": "ratio",
    "alpha": "decimal_annualized",
    "infoRatio": "ratio",
}
WINDOW_METRIC_KEYS = {
    "1D": ("ret1y",),
    "1W": ("ret1y", "volatility", "maxDD"),
    "1M": ("ret1y", "volatility", "maxDD"),
    "1Y": METRIC_KEYS,
}


class TopPicksConfigurationError(ValueError):
    pass


def _finite_float(value):
    if isinstance(value, bool):
        return None
    try:
        normalized = float(value)
    except (TypeError, ValueError):
        return None
    return normalized if math.isfinite(normalized) else None


def normalize_benchmark(value):
    if not isinstance(value, str):
        raise TopPicksConfigurationError(
            "Top Picks benchmark must be a ticker symbol."
        )
    benchmark = value.strip().upper()
    if not TICKER_PATTERN.fullmatch(benchmark):
        raise TopPicksConfigurationError(
            "Top Picks benchmark must be a ticker symbol."
        )
    return benchmark


def normalize_risk_free_rate(value):
    rate = _finite_float(value)
    if rate is None or not -1 <= rate <= 1:
        raise TopPicksConfigurationError(
            "Top Picks risk-free rate is invalid."
        )
    return rate


def normalize_universe_limit(value):
    if isinstance(value, str) and value.strip().isdecimal():
        value = int(value.strip())
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not 1 <= value <= MAX_TICKER_UNIVERSE
    ):
        raise TopPicksConfigurationError(
            "Top Picks universe limit is invalid."
        )
    return value


def normalize_cache_ttl(value):
    if isinstance(value, str) and value.strip().isdecimal():
        value = int(value.strip())
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not 0 <= value <= 86_400
    ):
        raise TopPicksConfigurationError(
            "Top Picks cache TTL is invalid."
        )
    return value


def normalize_source(value):
    if not isinstance(value, str) or not value.strip():
        raise TopPicksConfigurationError(
            "Top Picks risk-free source is invalid."
        )
    return value.strip()[:120]


def normalize_refresh_setting(value, name, minimum, maximum):
    if isinstance(value, str) and value.strip().isdecimal():
        value = int(value.strip())
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise TopPicksConfigurationError(f"Top Picks {name} is invalid.")
    return value


def normalize_as_of(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise TopPicksConfigurationError(
            "Top Picks risk-free as-of date is invalid."
        )
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise TopPicksConfigurationError(
            "Top Picks risk-free as-of date is invalid."
        ) from error
    if parsed.isoformat() != value:
        raise TopPicksConfigurationError(
            "Top Picks risk-free as-of date is invalid."
        )
    return value
