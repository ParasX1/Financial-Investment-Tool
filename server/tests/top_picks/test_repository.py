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

    def select(self, columns):
        self.selected = columns
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
    def __init__(self, rows):
        self.query = FakeTickerQuery(rows)
        self.table_name = None

    def table(self, name):
        self.table_name = name
        return self.query


def test_repository_reads_a_capped_normalized_ticker_universe():
    client = FakeSupabaseClient([
        {"symbol": " aapl ", "name": "Apple", "industry": "Tech"},
        {"symbol": "AAPL", "name": "Duplicate", "industry": "Tech"},
        {"symbol": "msft", "name": None, "industry": None},
        {"symbol": "bad ticker", "name": "Bad", "industry": "Unknown"},
        {"name": "Missing symbol", "industry": "Unknown"},
    ])

    tickers = SupabaseTickerRepository(client).list_tickers()

    assert client.table_name == "tickers"
    assert client.query.selected == "symbol,name,industry"
    assert client.query.ordered_by == "symbol"
    assert client.query.limit_value == MAX_TICKER_UNIVERSE
    assert tickers == (
        Ticker(symbol="AAPL", name="Apple", industry="Tech"),
        Ticker(symbol="MSFT", name="MSFT", industry="Unknown"),
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
