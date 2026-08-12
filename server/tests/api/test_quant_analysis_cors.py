from tests.api.test_quant_analysis_api import FakeQuantService, _app


def test_quant_response_exposes_trace_header_to_cross_origin_browser():
    response = _app(FakeQuantService()).test_client().get(
        "/api/v1/quant-analysis/capabilities",
        headers={"Origin": "http://127.0.0.1:3000"},
    )

    assert response.status_code == 200
    exposed = {
        value.strip().casefold()
        for value in response.headers.get(
            "Access-Control-Expose-Headers",
            "",
        ).split(",")
        if value.strip()
    }
    assert "x-trace-id" in exposed
    assert response.headers["X-Trace-ID"]
