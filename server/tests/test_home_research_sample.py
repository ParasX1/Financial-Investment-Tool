"""Keep the Home example aligned with the production financial calculators."""

import importlib.util
import json
from pathlib import Path
import sys

import pandas as pd
import pytest

from src import metrics


REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE_PATH = (
    REPO_ROOT / "client/features/home/data/researchDeskSample.json"
)


def test_home_research_sample_matches_production_calculators(monkeypatch):
    sample = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))
    companies = sample["companies"]
    dates = sample["dates"]
    symbols = [company["symbol"] for company in companies]

    assert symbols == ["AAPL", "MSFT"]
    assert sample["annualisationDays"] == 252
    assert len(dates) == len(set(dates)) == 20
    assert dates == sorted(dates)
    assert dates[0] == sample["period"]["start"] == "2024-09-03"
    assert dates[-1] == sample["period"]["end"] == "2024-09-30"
    assert all(len(company["adjustedClose"]) == 20 for company in companies)

    prices = pd.concat(
        {
            company["symbol"]: pd.DataFrame(
                {"Adj Close": company["adjustedClose"]}, index=dates
            )
            for company in companies
        },
        axis=1,
    )
    monkeypatch.setattr(metrics, "fetch_stock_data", lambda *args: prices)
    period = sample["period"]
    args = (symbols, period["start"], period["end"])
    cumulative_returns = metrics.calculate_cumulative_return(*args)
    drawdowns = metrics.calculate_drawdown(*args)
    volatilities = metrics.calculate_volatility(*args)

    for company in companies:
        symbol = company["symbol"]
        cumulative_return = cumulative_returns[symbol]
        drawdown = drawdowns[symbol]
        assert len(company["cumulativeReturn"]) == 20
        assert len(company["drawdown"]) == 20
        assert company["cumulativeReturn"] == pytest.approx(
            cumulative_return.tolist(), rel=1e-12, abs=1e-12
        )
        assert company["drawdown"] == pytest.approx(
            drawdown.tolist(), rel=1e-12, abs=1e-12
        )
        assert company["cumulativeReturn"][0] == 0
        assert company["drawdown"][0] == 0
        assert len(metrics.calculate_returns(prices[symbol]).dropna()) == 19
        assert company["totalReturn"] == pytest.approx(
            cumulative_return.iloc[-1], rel=1e-12, abs=1e-12
        )
        assert company["annualisedVolatility"] == pytest.approx(
            volatilities[symbol], rel=1e-12, abs=1e-12
        )
        assert company["maxDrawdown"] == pytest.approx(
            drawdown.min(), rel=1e-12, abs=1e-12
        )


def test_generator_check_reports_stale_exports_without_writing(tmp_path, monkeypatch):
    script = REPO_ROOT / "scripts/generate_home_research_sample.py"
    spec = importlib.util.spec_from_file_location("home_research_generator", script)
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)

    sample = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))
    sample["companies"][0]["totalReturn"] = 999
    path = tmp_path / "sample.json"
    stale = json.dumps(sample, indent=2) + "\n"
    path.write_text(stale, encoding="utf-8")
    monkeypatch.setattr(generator, "SAMPLE_PATH", path)
    monkeypatch.setattr(sys, "argv", [str(script), "--check"])

    assert generator.main() == 1
    assert path.read_text(encoding="utf-8") == stale

    monkeypatch.setattr(sys, "argv", [str(script)])
    assert generator.main() == 0
    updated = json.loads(path.read_text(encoding="utf-8"))
    assert updated["dates"] == sample["dates"]
    for actual, original in zip(updated["companies"], sample["companies"]):
        assert actual["adjustedClose"] == original["adjustedClose"]

    monkeypatch.setattr(sys, "argv", [str(script), "--check"])
    reformatted = json.dumps(updated, separators=(",", ":"))
    path.write_text(reformatted, encoding="utf-8")
    assert generator.main() == 0
    assert path.read_text(encoding="utf-8") == reformatted
