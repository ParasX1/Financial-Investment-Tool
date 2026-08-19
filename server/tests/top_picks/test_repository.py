from src.top_picks.contracts import Ticker
from src.top_picks.repository import (
    MAX_TICKER_UNIVERSE,
    SupabaseTickerRepository,
)


class FakeTickerQuery:
    def __init__(self, rows):
        self.rows = rows
        self.selected = None
        self.ordered_by = None
        self.limit_value = None
        self.filters = []

    def select(self, columns):
        self.selected = columns
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def order(self, column):
        self.ordered_by = column
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def execute(self):
        return type("Response", (), {"data": self.rows})()


class FakeSupabaseClient:
    def __init__(self, rows, missing_tables=()):
        self.rows = rows
        self.missing_tables = set(missing_tables)
        self.queries = {}
        self.table_name = None

    def table(self, name):
        self.table_name = name
        if name in self.missing_tables:
            raise RuntimeError("missing table")
        query = FakeTickerQuery(self.rows)
        self.queries[name] = query
        return query


def test_repository_reads_the_standard_top_picks_universe():
    client = FakeSupabaseClient([
        {"symbol": " aapl ", "name": "Apple", "industry": "Tech"},
        {"symbol": "AAPL", "name": "Duplicate", "industry": "Tech"},
        {"symbol": "msft", "name": None, "industry": None},
        {"symbol": "bad ticker", "name": "Bad", "industry": "Unknown"},
        {"name": "Missing symbol", "industry": "Unknown"},
    ])

    tickers = SupabaseTickerRepository(client).list_tickers()

    query = client.queries["top_picks_universe"]
    assert client.table_name == "top_picks_universe"
    assert query.selected == "symbol,name,industry"
    assert query.ordered_by == "symbol"
    assert query.limit_value == MAX_TICKER_UNIVERSE
    assert query.filters == [("active", True)]
    assert tickers == (
        Ticker(symbol="AAPL", name="Apple", industry="Tech"),
        Ticker(symbol="MSFT", name="MSFT", industry="Unknown"),
    )


def test_repository_falls_back_to_legacy_tickers_before_migration():
    client = FakeSupabaseClient(
        [{"symbol": "BHP.AX", "name": "BHP", "industry": "Materials"}],
        missing_tables=("top_picks_universe",),
    )

    tickers = SupabaseTickerRepository(client).list_tickers()

    assert client.table_name == "tickers"
    assert tickers == (
        Ticker(symbol="BHP.AX", name="BHP", industry="Materials"),
    )


def test_repository_enforces_cap_even_if_provider_ignores_limit():
    rows = [
        {"symbol": f"T{index}", "name": f"Ticker {index}"}
        for index in range(MAX_TICKER_UNIVERSE + 20)
    ]

    tickers = SupabaseTickerRepository(
        FakeSupabaseClient(rows)
    ).list_tickers()

    assert len(tickers) == MAX_TICKER_UNIVERSE
