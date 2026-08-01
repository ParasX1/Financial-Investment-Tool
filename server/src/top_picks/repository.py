from ..market_primitives import TICKER_PATTERN
from .contracts import Ticker


MAX_TICKER_UNIVERSE = 100


class TopPicksDataSourceError(RuntimeError):
    pass


class SupabaseTickerRepository:
    def __init__(self, supabase_client):
        self._supabase_client = supabase_client

    def list_tickers(self, limit=MAX_TICKER_UNIVERSE):
        if (
            isinstance(limit, bool)
            or not isinstance(limit, int)
            or not 1 <= limit <= MAX_TICKER_UNIVERSE
        ):
            raise ValueError("Ticker universe limit is invalid.")

        try:
            response = (
                self._supabase_client.table("tickers")
                .select("symbol,name,industry")
                .order("symbol")
                .limit(MAX_TICKER_UNIVERSE)
                .execute()
            )
        except Exception as error:
            raise TopPicksDataSourceError(
                "Unable to load the ticker universe."
            ) from error

        rows = getattr(response, "data", None)
        if not isinstance(rows, list):
            raise TopPicksDataSourceError(
                "Ticker universe response was invalid."
            )
        return self._normalize_rows(rows, limit)

    @staticmethod
    def _normalize_rows(rows, limit):
        tickers = []
        seen_symbols = set()
        for row in rows:
            if len(tickers) >= limit:
                break
            if not isinstance(row, dict):
                continue

            raw_symbol = row.get("symbol")
            if not isinstance(raw_symbol, str):
                continue
            symbol = raw_symbol.strip().upper()
            if (
                not TICKER_PATTERN.fullmatch(symbol)
                or symbol in seen_symbols
            ):
                continue

            raw_name = row.get("name")
            raw_industry = row.get("industry")
            name = (
                raw_name.strip()
                if isinstance(raw_name, str) and raw_name.strip()
                else symbol
            )
            industry = (
                raw_industry.strip()
                if isinstance(raw_industry, str) and raw_industry.strip()
                else "Unknown"
            )
            tickers.append(Ticker(symbol, name, industry))
            seen_symbols.add(symbol)

        return tuple(tickers)
