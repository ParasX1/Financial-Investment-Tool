from unittest.mock import Mock

import pytest

from src.server import create_app
from src.top_picks.repository import TopPicksDataSourceError


class FakeTopPicksService:
    def __init__(self, response=None, error=None):
        self.response = response or {
            "data": {"rows": [], "total": 0},
            "metadata": {"benchmark": "SPY"},
            "warnings": [],
        }
        self.error = error
        self.requests = []

    def get_page(self, top_picks_request):
        self.requests.append(top_picks_request)
        if self.error is not None:
            raise self.error
        return self.response


def test_top_picks_route_validates_and_forwards_the_request():
    service = FakeTopPicksService()
    app = create_app(
        {"TESTING": True},
        top_picks_service=service,
    )

    response = app.test_client().post(
        "/api/top-picks",
        json={
            "page": 2,
            "page_size": 10,
            "sort_key": "infoRatio",
            "sort_dir": "asc",
        },
    )

    assert response.status_code == 200
    assert response.get_json() == service.response
    assert len(service.requests) == 1
    request = service.requests[0]
    assert request.page == 2
    assert request.page_size == 10
    assert request.sort_key == "infoRatio"
    assert request.sort_dir == "asc"


@pytest.mark.parametrize(
    "payload",
    [None, [], {"page_size": 101}, {"sort_key": "name"}],
)
def test_top_picks_route_rejects_invalid_requests(payload):
    service = FakeTopPicksService()
    app = create_app(
        {"TESTING": True},
        top_picks_service=service,
    )
    client = app.test_client()

    if payload is None:
        response = client.post(
            "/api/top-picks",
            data="not-json",
            content_type="application/json",
        )
    else:
        response = client.post("/api/top-picks", json=payload)

    assert response.status_code == 400
    assert "error" in response.get_json()
    assert service.requests == []


def test_top_picks_route_returns_safe_data_source_error():
    service = FakeTopPicksService(
        error=TopPicksDataSourceError("provider token must not leak")
    )
    app = create_app(
        {"TESTING": True},
        top_picks_service=service,
    )

    response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 502
    assert response.get_json() == {
        "error": "Top Picks data is temporarily unavailable."
    }
    assert "provider token" not in response.get_data(as_text=True)


def test_top_picks_route_returns_safe_unexpected_error():
    service = FakeTopPicksService(
        error=RuntimeError("internal secret must not leak")
    )
    app = create_app(
        {"TESTING": False, "PROPAGATE_EXCEPTIONS": False},
        top_picks_service=service,
    )

    response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 500
    assert response.get_json() == {
        "error": "Unable to calculate Top Picks. Please try again."
    }
    assert "internal secret" not in response.get_data(as_text=True)


def test_top_picks_route_requires_supabase_configuration():
    app = create_app({
        "TESTING": True,
        "SUPABASE_URL": None,
        "SUPABASE_KEY": None,
    })

    response = app.test_client().post("/api/top-picks", json={})

    assert response.status_code == 503
    assert response.get_json() == {
        "error": "Top Picks service is not configured."
    }


def test_application_factory_registers_top_picks_blueprint():
    service = Mock()
    app = create_app(
        {"TESTING": True},
        top_picks_service=service,
    )

    assert "top_picks" in app.blueprints
    rules = {rule.rule for rule in app.url_map.iter_rules()}
    assert "/api/top-picks" in rules
