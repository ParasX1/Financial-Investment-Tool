"""Matched synthetic workload; provider calls are not production quotas."""
from datetime import date, datetime, timedelta, timezone
from unittest.mock import Mock

import pandas as pd

from src.top_picks import service as module
from src.top_picks.contracts import Ticker, TopPicksRequest
from src.top_picks.service import TopPicksService, TopPicksSnapshotCache


def run_workload(monkeypatch, *, lifecycle=False):
    now = [0.0]
    jobs, subscriptions, ages = [], [], []
    counts = {"downloads": 0, "rebuilds": 0, "responses": 0}
    today = date(2026, 10, 4)

    class DeferredThread:
        def __init__(self, target, daemon):
            jobs.append(target)

        def start(self):
            pass

    monkeypatch.setattr(module, "Thread", DeferredThread)

    def download(*args):
        counts["downloads"] += 1
        now[0] += 1  # Same fixed one-second provider round in both revisions.
        return pd.DataFrame()

    kwargs = {}
    if "refresh_clock" in __import__("inspect").signature(TopPicksService).parameters:
        kwargs["refresh_clock"] = lambda: now[0]
        kwargs["refresh_waiter"] = lambda seconds: advance(seconds)
    service = TopPicksService(
        ticker_repository=Mock(list_tickers=Mock(return_value=(Ticker("AAA", "Alpha", "Tech"),))),
        calculator_provider=Mock(), market_data_provider=download,
        today_provider=lambda: today,
        snapshot_cache=TopPicksSnapshotCache(clock=lambda: now[0]), **kwargs,
    )

    def close_all():
        for subscription in subscriptions:
            subscription.close()

    def read():
        response = service.get_page(TopPicksRequest(1, 25, "ret1y", "desc", "1Y"))
        generated = datetime.fromisoformat(response["metadata"]["generatedAt"])
        age = now[0] - (generated - datetime(2026, 10, 4, tzinfo=timezone.utc)).total_seconds()
        ages.append(age)
        counts["responses"] += 1
        assert response["data"]["rows"][0]["symbol"] == "AAA"

    def advance(seconds):
        end = min(120 if not lifecycle or now[0] >= 90 else 30, now[0] + seconds)
        while now[0] < end:
            now[0] = min(now[0] + 1, end)
            read()
        if now[0] >= end and end in (30, 120):
            close_all()
        return not service._updates.has_subscribers

    def build(start, end, window, **kwargs):
        counts["rebuilds"] += 1
        generated = datetime(2026, 10, 4, tzinfo=timezone.utc) + timedelta(seconds=now[0])
        return {"rows": [{"symbol": "AAA", "ret1y": 0.1}],
                "metadata": {"windowCode": window, "generatedAt": generated.isoformat()}, "warnings": []}

    monkeypatch.setattr(service, "_build_snapshot", build)
    monkeypatch.setattr(service._updates, "wait_for_inactive", advance)
    original_refresh = service._refresh_window_snapshots

    def refresh(*args):
        result = original_refresh(*args)
        read()
        if now[0] >= (120 if not lifecycle or now[0] >= 90 else 30):
            close_all()
        return result

    monkeypatch.setattr(service, "_refresh_window_snapshots", refresh)
    subscriptions.extend(service.subscribe_updates(window) for window in ["1Y", "1Y", "1M"])
    jobs.pop(0)()
    if lifecycle:
        now[0] = 90  # Hidden 30–60s, offline 60–90s; matching snapshot retained.
        subscriptions.extend(service.subscribe_updates(window) for window in ["1Y", "1M"])
        jobs.pop(0)()
    return {**counts, "maximum_active_snapshot_age_seconds": max(ages), "available_responses": counts["responses"]}


def test_paced_workload_meets_active_freshness_budget(monkeypatch):
    result = run_workload(monkeypatch)
    assert result["downloads"] == 2
    assert result["rebuilds"] == 8
    assert result["maximum_active_snapshot_age_seconds"] <= 61
    assert result["available_responses"] >= 120


def test_hidden_offline_workload_retains_available_matching_data(monkeypatch):
    result = run_workload(monkeypatch, lifecycle=True)
    assert result["downloads"] == 2
    assert result["rebuilds"] == 8
    assert result["maximum_active_snapshot_age_seconds"] <= 61
    assert result["available_responses"] >= 60
