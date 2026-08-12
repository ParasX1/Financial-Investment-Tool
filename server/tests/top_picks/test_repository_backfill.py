from src.top_picks.repository import (
    MAX_TICKER_UNIVERSE,
    SupabaseTickerRepository,
)


class LimitAwareQuery:
    def __init__(self, rows):
        self.rows = rows
        self.limit_value = None

    def select(self, columns):
        return self

    def order(self, column):
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def execute(self):
        rows = self.rows[:self.limit_value]
        return type("Response", (), {"data": rows})()


class FakeSupabaseClient:
    def __init__(self, rows):
        self.query = LimitAwareQuery(rows)

    def table(self, name):
        return self.query


def test_repository_filters_bounded_raw_window_before_configured_cap():
    client = FakeSupabaseClient([
        {"symbol": "bad ticker"},
        {"symbol": "AAPL"},
        {"symbol": "aapl"},
        {"symbol": "MSFT"},
        {"symbol": "GOOG"},
        {"symbol": "BHP.AX"},
    ])

    tickers = SupabaseTickerRepository(client).list_tickers(limit=3)

    assert client.query.limit_value == MAX_TICKER_UNIVERSE
    assert [ticker.symbol for ticker in tickers] == [
        "AAPL",
        "MSFT",
        "GOOG",
    ]
