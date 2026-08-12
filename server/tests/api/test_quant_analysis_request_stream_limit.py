from flask.wrappers import Request
from werkzeug.exceptions import RequestEntityTooLarge

from src.quant_analysis.service import MAX_BODY_BYTES
from tests.api.test_quant_analysis_api import FakeQuantService, _app


def test_runs_endpoint_maps_stream_limit_to_safe_413(monkeypatch):
    service = FakeQuantService()

    def raise_request_too_large(self, cache=True):
        assert self.max_content_length == MAX_BODY_BYTES
        raise RequestEntityTooLarge()

    monkeypatch.setattr(Request, "get_data", raise_request_too_large)

    response = _app(service).test_client().post(
        "/api/v1/quant-analysis/runs",
        data="{}",
        content_type="application/json",
    )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "REQUEST_TOO_LARGE"
    assert response.get_json()["error"]["traceId"] == (
        response.headers["X-Trace-ID"]
    )
    assert service.run_calls == []
