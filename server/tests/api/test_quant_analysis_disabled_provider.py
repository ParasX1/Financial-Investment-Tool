from src.quant_analysis.service import QuantAnalysisService
from src.server import create_app

from tests.api.test_quant_analysis_api import AllowingLimiter
from tests.quant_analysis.test_contracts import VALID_PAYLOAD
from tests.quant_analysis.test_disabled_provider_boundary import (
    DisabledProvider,
)
from tests.quant_analysis.test_service import (
    FixtureMarketAdapter,
    _complete_snapshot,
)


def test_disabled_provider_returns_a_safe_503_envelope_without_fetching():
    adapter = FixtureMarketAdapter(_complete_snapshot())
    provider = DisabledProvider()
    service = QuantAnalysisService(
        market_adapter=adapter,
        provider=provider,
    )
    app = create_app(
        {"TESTING": True},
        quant_analysis_service=service,
        quant_rate_limiter=AllowingLimiter(),
    )

    response = app.test_client().post(
        "/api/v1/quant-analysis/runs",
        json=VALID_PAYLOAD,
    )

    payload = response.get_json()
    assert response.status_code == 503
    assert payload["error"]["code"] == "SERVICE_UNAVAILABLE"
    assert payload["error"]["traceId"] == response.headers["X-Trace-ID"]
    assert "provider" not in payload["error"]["message"].lower()
    assert adapter.requests == []
    assert provider.execution_calls == 0
