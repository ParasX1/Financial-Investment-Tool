from dataclasses import dataclass


DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 25
DEFAULT_SORT_KEY = "sharpe"
DEFAULT_SORT_DIR = "desc"
MAX_PAGE = 10_000
MAX_PAGE_SIZE = 100
SORT_KEYS = frozenset({
    "ret1y",
    "sharpe",
    "sortino",
    "volatility",
    "maxDD",
    "beta",
    "alpha",
    "infoRatio",
})
SORT_DIRECTIONS = frozenset({"asc", "desc"})


class TopPicksRequestValidationError(ValueError):
    pass


@dataclass(frozen=True)
class TopPicksRequest:
    page: int
    page_size: int
    sort_key: str
    sort_dir: str


@dataclass(frozen=True)
class Ticker:
    symbol: str
    name: str
    industry: str


def _validate_integer(value, field_name, minimum, maximum):
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not minimum <= value <= maximum
    ):
        raise TopPicksRequestValidationError(
            f"{field_name} must be an integer between "
            f"{minimum} and {maximum}."
        )
    return value


def validate_top_picks_request(payload):
    if not isinstance(payload, dict):
        raise TopPicksRequestValidationError(
            "Request body must be a JSON object."
        )

    page = _validate_integer(
        payload.get("page", DEFAULT_PAGE),
        "page",
        1,
        MAX_PAGE,
    )
    page_size = _validate_integer(
        payload.get("page_size", DEFAULT_PAGE_SIZE),
        "page_size",
        1,
        MAX_PAGE_SIZE,
    )

    sort_key = payload.get("sort_key", DEFAULT_SORT_KEY)
    if not isinstance(sort_key, str) or sort_key not in SORT_KEYS:
        raise TopPicksRequestValidationError(
            "sort_key is not a supported Top Picks metric."
        )

    sort_dir = payload.get("sort_dir", DEFAULT_SORT_DIR)
    if not isinstance(sort_dir, str) or sort_dir not in SORT_DIRECTIONS:
        raise TopPicksRequestValidationError(
            "sort_dir must be either asc or desc."
        )

    return TopPicksRequest(
        page=page,
        page_size=page_size,
        sort_key=sort_key,
        sort_dir=sort_dir,
    )
