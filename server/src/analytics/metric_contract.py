from datetime import date, datetime, timezone
import math

from ..market_primitives import TICKER_PATTERN, normalize_tickers


MAX_STOCK_TICKERS = 5
MAX_PORTFOLIOS = 10000

METRIC_METHODS = {
    "betaanalysis": "Pairwise covariance divided by benchmark variance.",
    "alphacomparison": (
        "Annualised arithmetic CAPM alpha using 252 trading days."
    ),
    "maxdrawdownanalysis": (
        "Adjusted close divided by its running peak, minus one."
    ),
    "cumulativereturncomparison": (
        "Adjusted-close return rebased to each symbol's first valid "
        "observation."
    ),
    "sortinoratiovisualization": (
        "Annualised excess return divided by full-sample downside "
        "deviation versus the daily target."
    ),
    "marketcorrelationanalysis": (
        "Mean of 21-trading-day rolling Pearson correlations."
    ),
    "sharperatiomatrix": (
        "Annualised arithmetic excess return divided by annualised "
        "sample volatility."
    ),
    "volatilityanalysis": (
        "Sample standard deviation of daily returns multiplied by "
        "square root of 252."
    ),
    "valueatriskanalysis": (
        "Positive magnitude of the selected lower-tail daily-return "
        "percentile."
    ),
    "efficientfrontiervisualization": (
        "Deterministic long-only Dirichlet allocation samples using "
        "annualised historical mean and covariance."
    ),
}


class MetricRequestValidationError(ValueError):
    pass


def _validate_date(value, field_name):
    if not isinstance(value, str):
        raise MetricRequestValidationError(
            f"{field_name} must use YYYY-MM-DD format."
        )

    try:
        parsed_date = date.fromisoformat(value)
    except ValueError as error:
        raise MetricRequestValidationError(
            f"{field_name} must use YYYY-MM-DD format."
        ) from error

    if parsed_date.isoformat() != value:
        raise MetricRequestValidationError(
            f"{field_name} must use YYYY-MM-DD format."
        )
    return parsed_date


def _validate_number(value, field_name, minimum, maximum, inclusive=True):
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
    ):
        raise MetricRequestValidationError(
            f"{field_name} must be a finite number."
        )

    if inclusive:
        is_in_range = minimum <= value <= maximum
    else:
        is_in_range = minimum < value < maximum
    if not is_in_range:
        raise MetricRequestValidationError(
            f"{field_name} is outside the supported range."
        )
    return value


def validate_metric_request(payload):
    if not isinstance(payload, dict):
        raise MetricRequestValidationError(
            "Request body must be a JSON object."
        )

    raw_tickers = payload.get("stock_tickers")
    if (
        not isinstance(raw_tickers, list)
        or any(not isinstance(ticker, str) for ticker in raw_tickers)
    ):
        raise MetricRequestValidationError(
            "stock_tickers must be a JSON array of ticker symbols."
        )

    stock_tickers = normalize_tickers(raw_tickers)
    if not 1 <= len(stock_tickers) <= MAX_STOCK_TICKERS:
        raise MetricRequestValidationError(
            "stock_tickers must contain between 1 and 5 unique tickers."
        )
    if any(not TICKER_PATTERN.fullmatch(ticker) for ticker in stock_tickers):
        raise MetricRequestValidationError(
            "stock_tickers contains an invalid ticker symbol."
        )

    start_date = payload.get("start_date", "2023-01-01")
    end_date = payload.get("end_date", "2024-01-01")
    parsed_start_date = _validate_date(start_date, "start_date")
    parsed_end_date = _validate_date(end_date, "end_date")
    if parsed_start_date >= parsed_end_date:
        raise MetricRequestValidationError(
            "start_date must be earlier than end_date."
        )

    raw_market_ticker = payload.get("market_ticker", "SPY")
    if not isinstance(raw_market_ticker, str):
        raise MetricRequestValidationError(
            "market_ticker must be a ticker symbol."
        )
    market_ticker = raw_market_ticker.strip().upper()
    if not TICKER_PATTERN.fullmatch(market_ticker):
        raise MetricRequestValidationError(
            "market_ticker contains an invalid ticker symbol."
        )

    risk_free_rate = _validate_number(
        payload.get("risk_free_rate", 0.01),
        "risk_free_rate",
        -1,
        1,
    )
    confidence_level = _validate_number(
        payload.get("confidence_level", 0.05),
        "confidence_level",
        0,
        1,
        inclusive=False,
    )

    num_portfolios = payload.get("num_portfolios", MAX_PORTFOLIOS)
    if (
        isinstance(num_portfolios, bool)
        or not isinstance(num_portfolios, int)
        or not 1 <= num_portfolios <= MAX_PORTFOLIOS
    ):
        raise MetricRequestValidationError(
            "num_portfolios must be an integer between 1 and 10000."
        )

    return {
        "stock_tickers": stock_tickers,
        "start_date": start_date,
        "end_date": end_date,
        "market_ticker": market_ticker,
        "risk_free_rate": risk_free_rate,
        "confidence_level": confidence_level,
        "num_portfolios": num_portfolios,
    }


def build_metric_response(metric_type, result, metric_request):
    requested = metric_request["stock_tickers"]
    if metric_type == "efficientfrontiervisualization":
        available = (
            [
                symbol
                for symbol in result.get("asset_order", [])
                if symbol in requested
            ]
            if isinstance(result, dict)
            else []
        )
    else:
        available = [
            symbol
            for symbol in requested
            if isinstance(result, dict) and symbol in result
        ]

    observations = {}
    actual_dates = []
    if isinstance(result, dict):
        for symbol in available:
            value = result.get(symbol)
            if metric_type in {
                "maxdrawdownanalysis",
                "cumulativereturncomparison",
            } and isinstance(value, dict):
                observations[symbol] = len(value)
                actual_dates.extend(str(item) for item in value.keys())
            elif (
                metric_type == "sortinoratiovisualization"
                and isinstance(value, dict)
                and isinstance(value.get("observations"), int)
            ):
                observations[symbol] = value["observations"]

    missing = [
        symbol for symbol in requested if symbol not in available
    ]
    metadata = {
        "requestedSymbols": requested,
        "availableSymbols": available,
        "missingSymbols": missing,
        "observationsBySymbol": observations,
        "annualisationDays": 252,
        "priceField": (
            "Adjusted Close, with Close fallback when unavailable"
        ),
        "method": METRIC_METHODS.get(
            metric_type,
            "Historical market-data calculation.",
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "requestedStart": metric_request["start_date"],
        "requestedEnd": metric_request["end_date"],
        "endDateInclusive": True,
    }
    if actual_dates:
        metadata["actualStart"] = min(actual_dates)
        metadata["actualEnd"] = max(actual_dates)
    if metric_type in {
        "betaanalysis",
        "alphacomparison",
        "marketcorrelationanalysis",
    }:
        metadata["benchmark"] = metric_request["market_ticker"]

    return {
        "data": result,
        "metadata": metadata,
        "warnings": [
            f"No usable result for {symbol}." for symbol in missing
        ],
    }
