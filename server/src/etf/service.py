from datetime import datetime, timezone


ETF_WINDOWS = frozenset({"1D", "1W", "1M", "1Y"})
DEFAULT_ETF_WINDOW = "1Y"
WINDOW_LABELS = {
    "1D": "trailing_day",
    "1W": "trailing_week",
    "1M": "trailing_month",
    "1Y": "trailing_one_year",
}


def _metrics(day, week, month, year):
    return {
        "1D": {
            "priceReturn": day,
            "volatility": None,
            "sharpe": None,
            "maxDrawdown": None,
        },
        "1W": {
            "priceReturn": week,
            "volatility": abs(week) * 7.5 + 0.09,
            "sharpe": None,
            "maxDrawdown": min(-0.004, week * -0.6),
        },
        "1M": {
            "priceReturn": month,
            "volatility": abs(month) * 2.2 + 0.11,
            "sharpe": None,
            "maxDrawdown": min(-0.012, month * -0.55),
        },
        "1Y": year,
    }


ETF_PREVIEW_ROWS = (
    {
        "symbol": "SPY",
        "name": "SPDR S&P 500 ETF Trust",
        "category": "US Large Blend",
        "issuer": "State Street",
        "expenseRatio": 0.000945,
        "aumUsd": 624_000_000_000,
        "metrics": _metrics(
            0.003,
            0.011,
            0.036,
            {
                "priceReturn": 0.184,
                "volatility": 0.128,
                "sharpe": 1.11,
                "maxDrawdown": -0.087,
            },
        ),
    },
    {
        "symbol": "QQQ",
        "name": "Invesco QQQ Trust",
        "category": "US Large Growth",
        "issuer": "Invesco",
        "expenseRatio": 0.002,
        "aumUsd": 329_000_000_000,
        "metrics": _metrics(
            0.006,
            0.019,
            0.052,
            {
                "priceReturn": 0.238,
                "volatility": 0.176,
                "sharpe": 1.22,
                "maxDrawdown": -0.112,
            },
        ),
    },
    {
        "symbol": "VOO",
        "name": "Vanguard S&P 500 ETF",
        "category": "US Large Blend",
        "issuer": "Vanguard",
        "expenseRatio": 0.0003,
        "aumUsd": 598_000_000_000,
        "metrics": _metrics(
            0.003,
            0.012,
            0.037,
            {
                "priceReturn": 0.185,
                "volatility": 0.127,
                "sharpe": 1.12,
                "maxDrawdown": -0.086,
            },
        ),
    },
    {
        "symbol": "IWM",
        "name": "iShares Russell 2000 ETF",
        "category": "US Small Cap",
        "issuer": "BlackRock",
        "expenseRatio": 0.0019,
        "aumUsd": 72_000_000_000,
        "metrics": _metrics(
            -0.002,
            0.007,
            0.025,
            {
                "priceReturn": 0.096,
                "volatility": 0.206,
                "sharpe": 0.43,
                "maxDrawdown": -0.151,
            },
        ),
    },
    {
        "symbol": "VTI",
        "name": "Vanguard Total Stock Market ETF",
        "category": "US Total Market",
        "issuer": "Vanguard",
        "expenseRatio": 0.0003,
        "aumUsd": 486_000_000_000,
        "metrics": _metrics(
            0.002,
            0.010,
            0.034,
            {
                "priceReturn": 0.177,
                "volatility": 0.134,
                "sharpe": 1.04,
                "maxDrawdown": -0.092,
            },
        ),
    },
    {
        "symbol": "VEA",
        "name": "Vanguard FTSE Developed Markets ETF",
        "category": "Developed ex-US",
        "issuer": "Vanguard",
        "expenseRatio": 0.0006,
        "aumUsd": 187_000_000_000,
        "metrics": _metrics(
            0.001,
            0.006,
            0.021,
            {
                "priceReturn": 0.121,
                "volatility": 0.118,
                "sharpe": 0.81,
                "maxDrawdown": -0.079,
            },
        ),
    },
    {
        "symbol": "VWO",
        "name": "Vanguard FTSE Emerging Markets ETF",
        "category": "Emerging Markets",
        "issuer": "Vanguard",
        "expenseRatio": 0.0008,
        "aumUsd": 91_000_000_000,
        "metrics": _metrics(
            -0.001,
            0.004,
            0.016,
            {
                "priceReturn": 0.074,
                "volatility": 0.143,
                "sharpe": 0.39,
                "maxDrawdown": -0.101,
            },
        ),
    },
    {
        "symbol": "XLK",
        "name": "Technology Select Sector SPDR Fund",
        "category": "US Technology",
        "issuer": "State Street",
        "expenseRatio": 0.0008,
        "aumUsd": 78_000_000_000,
        "metrics": _metrics(
            0.009,
            0.027,
            0.066,
            {
                "priceReturn": 0.264,
                "volatility": 0.189,
                "sharpe": 1.27,
                "maxDrawdown": -0.124,
            },
        ),
    },
    {
        "symbol": "XLE",
        "name": "Energy Select Sector SPDR Fund",
        "category": "US Energy",
        "issuer": "State Street",
        "expenseRatio": 0.0008,
        "aumUsd": 35_000_000_000,
        "metrics": _metrics(
            -0.004,
            -0.006,
            0.012,
            {
                "priceReturn": 0.052,
                "volatility": 0.219,
                "sharpe": 0.18,
                "maxDrawdown": -0.167,
            },
        ),
    },
    {
        "symbol": "TLT",
        "name": "iShares 20+ Year Treasury Bond ETF",
        "category": "Long Treasury",
        "issuer": "BlackRock",
        "expenseRatio": 0.0015,
        "aumUsd": 54_000_000_000,
        "metrics": _metrics(
            0.002,
            -0.008,
            -0.021,
            {
                "priceReturn": -0.031,
                "volatility": 0.151,
                "sharpe": -0.43,
                "maxDrawdown": -0.139,
            },
        ),
    },
)


def validate_etf_window(value):
    if value is None:
        return DEFAULT_ETF_WINDOW
    if value not in ETF_WINDOWS:
        raise ValueError("window must be one of 1D, 1W, 1M, or 1Y.")
    return value


class EtfPreviewService:
    def list_ranked_etfs(self, window=DEFAULT_ETF_WINDOW):
        resolved_window = validate_etf_window(window)
        rows = []
        for row in ETF_PREVIEW_ROWS:
            metrics = row["metrics"][resolved_window]
            rows.append({
                "symbol": row["symbol"],
                "name": row["name"],
                "category": row["category"],
                "issuer": row["issuer"],
                "expenseRatio": row["expenseRatio"],
                "aumUsd": row["aumUsd"],
                "priceReturn": metrics["priceReturn"],
                "volatility": metrics["volatility"],
                "sharpe": metrics["sharpe"],
                "maxDrawdown": metrics["maxDrawdown"],
            })

        sort_key = "sharpe" if resolved_window == "1Y" else "priceReturn"
        ranked = sorted(
            rows,
            key=lambda row: row[sort_key]
            if row[sort_key] is not None
            else float("-inf"),
            reverse=True,
        )
        ranked_rows = [
            {**row, "rank": index}
            for index, row in enumerate(ranked, start=1)
        ]
        return {
            "data": {
                "rows": ranked_rows,
                "total": len(ranked_rows),
            },
            "metadata": {
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "source": "hardcoded_preview",
                "universeCount": len(ETF_PREVIEW_ROWS),
                "window": WINDOW_LABELS[resolved_window],
                "windowCode": resolved_window,
                "sortKey": sort_key,
            },
            "warnings": [
                "ETF data is a hardcoded preview and is not live market data."
            ],
        }
