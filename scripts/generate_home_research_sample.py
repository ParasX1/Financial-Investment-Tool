"""Derive the frozen Home example with production calculators, without network IO."""

import argparse
from copy import deepcopy
import json
from pathlib import Path
import sys
from unittest.mock import patch

import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[1]
SAMPLE_PATH = (
    REPO_ROOT / "client/features/home/data/researchDeskSample.json"
)
sys.path.insert(0, str(REPO_ROOT / "server"))

from src import metrics  # noqa: E402


def generate_sample(sample):
    """Preserve the captured prices and derive all display values on the server."""
    result = deepcopy(sample)
    companies = result["companies"]
    symbols = [company["symbol"] for company in companies]
    prices = pd.concat(
        {
            company["symbol"]: pd.DataFrame(
                {"Adj Close": company["adjustedClose"]}, index=result["dates"]
            )
            for company in companies
        },
        axis=1,
    )
    period = result["period"]
    args = (symbols, period["start"], period["end"])
    with patch.object(metrics, "fetch_stock_data", return_value=prices):
        cumulative_returns = metrics.calculate_cumulative_return(*args)
        drawdowns = metrics.calculate_drawdown(*args)
        volatilities = metrics.calculate_volatility(*args)

    for company in companies:
        symbol = company["symbol"]
        cumulative_return = cumulative_returns[symbol]
        drawdown = drawdowns[symbol]
        company["cumulativeReturn"] = cumulative_return.tolist()
        company["drawdown"] = drawdown.tolist()
        company["totalReturn"] = float(cumulative_return.iloc[-1])
        company["annualisedVolatility"] = volatilities[symbol]
        company["maxDrawdown"] = float(drawdown.min())
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="Check the saved export without writing."
    )
    args = parser.parse_args()
    current = SAMPLE_PATH.read_text(encoding="utf-8")
    sample = generate_sample(json.loads(current))
    generated = json.dumps(sample, indent=2, allow_nan=False) + "\n"
    if args.check:
        if json.loads(current) != sample:
            print("Home research sample is stale; run this script without --check.")
            return 1
        print("Home research sample matches production calculators (40 observations).")
        return 0
    SAMPLE_PATH.write_text(generated, encoding="utf-8", newline="\n")
    print(f"Generated {SAMPLE_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
