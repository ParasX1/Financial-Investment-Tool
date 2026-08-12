from dataclasses import dataclass
from uuid import RFC_4122, UUID

from ..market_primitives import TICKER_PATTERN


PERIODS = ("1mo", "3mo", "6mo", "1y", "2y")
INTERVALS = ("1d",)
OBJECTIVES = ("signal_scan", "risk_review", "scenario_plan")
RISK_PROFILES = ("conservative", "balanced", "aggressive")
MAX_SYMBOL_LENGTH = 15

_REQUIRED_FIELDS = frozenset({
    "clientRunId",
    "symbol",
    "benchmark",
    "period",
    "interval",
    "objective",
    "riskProfile",
})
_OPTIONAL_FIELDS = frozenset({"compareToRunId"})
_ALLOWED_FIELDS = _REQUIRED_FIELDS | _OPTIONAL_FIELDS


class QuantRunRequestValidationError(ValueError):
    def __init__(self, fields):
        super().__init__("The request could not be validated.")
        self.fields = dict(fields)


@dataclass(frozen=True)
class QuantRunRequest:
    client_run_id: str
    symbol: str
    benchmark: str
    period: str
    interval: str
    objective: str
    risk_profile: str
    compare_to_run_id: str | None = None

    def to_dict(self):
        payload = {
            "clientRunId": self.client_run_id,
            "symbol": self.symbol,
            "benchmark": self.benchmark,
            "period": self.period,
            "interval": self.interval,
            "objective": self.objective,
            "riskProfile": self.risk_profile,
        }
        if self.compare_to_run_id is not None:
            payload["compareToRunId"] = self.compare_to_run_id
        return payload


def _normalize_uuid(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = UUID(value.strip())
    except (ValueError, AttributeError):
        return None
    if parsed.version != 4 or parsed.variant != RFC_4122:
        return None
    return str(parsed)


def _normalize_symbol(value):
    if not isinstance(value, str):
        return None
    normalized = value.strip().upper()
    if not normalized or len(normalized) > MAX_SYMBOL_LENGTH:
        return None
    return normalized if TICKER_PATTERN.fullmatch(normalized) else None


def _enum_value(payload, field, allowed, errors):
    value = payload.get(field)
    if not isinstance(value, str) or value not in allowed:
        errors[field] = "Unsupported value."
        return None
    return value


def validate_quant_run_request(payload):
    if not isinstance(payload, dict):
        raise QuantRunRequestValidationError({
            "body": "Expected a JSON object.",
        })

    unknown_fields = sorted(set(payload) - _ALLOWED_FIELDS)
    if unknown_fields:
        raise QuantRunRequestValidationError({
            field: "Unknown field." for field in unknown_fields
        })

    errors = {}
    for field in sorted(_REQUIRED_FIELDS - set(payload)):
        errors[field] = "Required field."

    client_run_id = _normalize_uuid(payload.get("clientRunId"))
    if "clientRunId" in payload and client_run_id is None:
        errors["clientRunId"] = "Expected a UUID."

    compare_to_run_id = None
    if "compareToRunId" in payload:
        compare_to_run_id = _normalize_uuid(payload.get("compareToRunId"))
        if compare_to_run_id is None:
            errors["compareToRunId"] = "Expected a UUID."

    symbol = _normalize_symbol(payload.get("symbol"))
    if "symbol" in payload and symbol is None:
        errors["symbol"] = "Expected a valid ticker symbol."

    benchmark = _normalize_symbol(payload.get("benchmark"))
    if "benchmark" in payload and benchmark is None:
        errors["benchmark"] = "Expected a valid ticker symbol."
    elif symbol is not None and benchmark == symbol:
        errors["benchmark"] = "Benchmark must differ from symbol."

    period = _enum_value(payload, "period", PERIODS, errors)
    interval = _enum_value(payload, "interval", INTERVALS, errors)
    objective = _enum_value(payload, "objective", OBJECTIVES, errors)
    risk_profile = _enum_value(
        payload,
        "riskProfile",
        RISK_PROFILES,
        errors,
    )

    if errors:
        raise QuantRunRequestValidationError(errors)

    return QuantRunRequest(
        client_run_id=client_run_id,
        symbol=symbol,
        benchmark=benchmark,
        period=period,
        interval=interval,
        objective=objective,
        risk_profile=risk_profile,
        compare_to_run_id=compare_to_run_id,
    )
