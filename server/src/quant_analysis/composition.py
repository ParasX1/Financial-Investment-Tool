from .market_data import YahooFinanceMarketDataAdapter
from .service import QuantAnalysisService


def create_quant_analysis_service(
    market_adapter=None,
    provider=None,
):
    resolved_adapter = (
        YahooFinanceMarketDataAdapter()
        if market_adapter is None
        else market_adapter
    )
    return QuantAnalysisService(
        market_adapter=resolved_adapter,
        provider=provider,
    )
