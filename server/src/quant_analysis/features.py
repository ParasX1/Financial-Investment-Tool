from dataclasses import dataclass
import math
from statistics import stdev

from .market_data import normalize_observations


FEATURE_SET_ID = "inspectable-market"
FEATURE_SET_VERSION = "1.0.0"
ANNUALISATION_DAYS = 252


@dataclass(frozen=True)
class FeatureSetResult:
    evidence: tuple[dict, ...]
    warnings: tuple[str, ...]
    data_quality: str
    symbol_observation_count: int
    benchmark_observation_count: int
    aligned_observation_count: int

    def value(self, key):
        for item in self.evidence:
            if item["key"] == key:
                return item["value"]
        return None


def _simple_returns(prices):
    returns = []
    for previous, current in zip(prices, prices[1:]):
        value = current / previous - 1
        if math.isfinite(value):
            returns.append(value)
    return returns


def _finite_or_none(value):
    return value if value is not None and math.isfinite(value) else None


def _cumulative_return(prices):
    if len(prices) < 2:
        return None
    return _finite_or_none(prices[-1] / prices[0] - 1)


def _annualized_volatility(returns):
    if len(returns) < 2:
        return None
    return _finite_or_none(stdev(returns) * math.sqrt(ANNUALISATION_DAYS))


def _maximum_drawdown(prices):
    if not prices:
        return None
    running_maximum = prices[0]
    minimum = 0.0
    for price in prices:
        running_maximum = max(running_maximum, price)
        minimum = min(minimum, price / running_maximum - 1)
    return _finite_or_none(minimum)


def _trend(prices, sessions):
    if len(prices) < sessions + 1:
        return None
    return _finite_or_none(prices[-1] / prices[-(sessions + 1)] - 1)


def _downside_frequency(returns):
    if not returns:
        return None
    return sum(value < 0 for value in returns) / len(returns)


def _mean_distance(prices, sessions):
    if len(prices) < sessions:
        return None
    average = sum(prices[-sessions:]) / sessions
    return _finite_or_none(prices[-1] / average - 1)


def _relative_return(symbol_observations, benchmark_observations):
    symbol_by_date = {
        observation.date: observation.adjusted_close
        for observation in symbol_observations
    }
    benchmark_by_date = {
        observation.date: observation.adjusted_close
        for observation in benchmark_observations
    }
    common_dates = sorted(set(symbol_by_date) & set(benchmark_by_date))
    if len(common_dates) < 2:
        return None, len(common_dates)
    first, last = common_dates[0], common_dates[-1]
    symbol_return = symbol_by_date[last] / symbol_by_date[first] - 1
    benchmark_return = (
        benchmark_by_date[last] / benchmark_by_date[first] - 1
    )
    return _finite_or_none(symbol_return - benchmark_return), len(common_dates)


def _evidence(key, label, value, unit, missing_warning=None):
    value = _finite_or_none(value)
    warnings = [] if value is not None else [missing_warning]
    return {
        "key": key,
        "label": label,
        "value": value,
        "unit": unit,
        "finite": value is not None,
        "warnings": [warning for warning in warnings if warning],
    }


def _canonical_snapshot_observations(snapshot):
    symbol, symbol_exclusions = normalize_observations(
        (
            (item.date, item.adjusted_close)
            for item in snapshot.symbol_observations
        ),
        snapshot.requested_start_date,
        snapshot.requested_end_date,
    )
    benchmark, benchmark_exclusions = normalize_observations(
        (
            (item.date, item.adjusted_close)
            for item in snapshot.benchmark_observations
        ),
        snapshot.requested_start_date,
        snapshot.requested_end_date,
    )
    warnings = list(snapshot.warnings)
    for name, symbol_name, exclusions in (
        ("symbol", snapshot.symbol, symbol_exclusions),
        ("benchmark", snapshot.benchmark, benchmark_exclusions),
    ):
        excluded_count = sum(exclusions.values())
        if excluded_count:
            warnings.append(
                f"{excluded_count} non-canonical {name} observations "
                f"were excluded for {symbol_name}."
            )
    return symbol, benchmark, warnings


def calculate_feature_set(snapshot):
    symbol_observations, benchmark_observations, warnings = (
        _canonical_snapshot_observations(snapshot)
    )
    prices = [item.adjusted_close for item in symbol_observations]
    returns = _simple_returns(prices)
    relative_return, aligned_count = _relative_return(
        symbol_observations,
        benchmark_observations,
    )
    evidence = (
        _evidence(
            "observation_count",
            "Observations",
            len(prices),
            "observations",
        ),
        _evidence(
            "cumulative_return",
            "Cumulative return",
            _cumulative_return(prices),
            "decimal_return",
            "Cumulative return requires at least 2 observations.",
        ),
        _evidence(
            "benchmark_relative_return",
            "Benchmark-relative return",
            relative_return,
            "decimal_return",
            "Benchmark-relative return requires at least 2 aligned dates.",
        ),
        _evidence(
            "annualized_volatility",
            "Annualized volatility",
            _annualized_volatility(returns),
            "decimal_annualized",
            "Annualized volatility requires at least 3 observations.",
        ),
        _evidence(
            "maximum_drawdown",
            "Maximum drawdown",
            _maximum_drawdown(prices),
            "decimal_drawdown",
            "Maximum drawdown requires at least 1 observation.",
        ),
        _evidence(
            "trend_20",
            "20-session trend",
            _trend(prices, 20),
            "decimal_return",
            "20-session trend requires at least 21 observations.",
        ),
        _evidence(
            "trend_60",
            "60-session trend",
            _trend(prices, 60),
            "decimal_return",
            "60-session trend requires at least 61 observations.",
        ),
        _evidence(
            "downside_frequency",
            "Downside frequency",
            _downside_frequency(returns),
            "fraction",
            "Downside frequency requires at least 2 observations.",
        ),
        _evidence(
            "distance_from_20_mean",
            "Distance from 20-session mean",
            _mean_distance(prices, 20),
            "decimal_distance",
            "20-session mean distance requires at least 20 observations.",
        ),
    )

    count = len(prices)
    if count < 20:
        data_quality = "insufficient"
    elif count <= 60:
        data_quality = "partial"
    else:
        data_quality = "complete"

    has_missing_evidence = any(not item["finite"] for item in evidence)
    if data_quality == "complete" and (
        warnings or has_missing_evidence or len(benchmark_observations) < 2
    ):
        data_quality = "partial"

    for item in evidence:
        warnings.extend(item["warnings"])

    return FeatureSetResult(
        evidence=evidence,
        warnings=tuple(dict.fromkeys(warnings)),
        data_quality=data_quality,
        symbol_observation_count=len(symbol_observations),
        benchmark_observation_count=len(benchmark_observations),
        aligned_observation_count=aligned_count,
    )
