"""Sync standard Top Picks universes into Supabase.

The script accepts CSV files or CSV URLs from external index providers and
upserts them into public.top_picks_universe. It intentionally keeps the source
of truth outside the application code so Top Picks does not depend on a
developer-maintained stock list.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from dataclasses import dataclass
from io import StringIO
from urllib.request import Request, urlopen

from supabase import create_client


VALID_MARKETS = {"US", "AU", "HK"}
VALID_SOURCES = {"SP500", "ASX200", "HSI", "MANUAL"}
VALID_PRESETS = {"ASX200", "SP500"}
OPEN_ASX_BASE_URL = "https://openasx.tangerineslab.com"
LOCAL_ASX200_FALLBACK = "data/asx200.csv"
SP500_CONSTITUENTS_URL = (
    "https://raw.githubusercontent.com/datasets/"
    "s-and-p-500-companies/main/data/constituents.csv"
)
EXCLUDED_SYMBOLS = {
    "ASX200": {"IFL.AX", "NSR.AX"},
}


@dataclass(frozen=True)
class CsvMapping:
    symbol: str
    name: str
    industry: str


def _read_text(location: str) -> str:
    if location.startswith(("https://", "http://")):
        request = Request(
            location,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; FinancialInvestmentTool/1.0)"
                ),
            },
        )
        with urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8-sig")
    with open(location, encoding="utf-8-sig", newline="") as handle:
        return handle.read()


def _normalize_symbol(raw_symbol: str, market: str) -> str:
    symbol = raw_symbol.strip().upper().replace("/", "-")
    if market == "US":
        symbol = symbol.replace(".", "-")
    if market == "AU" and "." not in symbol:
        symbol = f"{symbol}.AX"
    if market == "HK":
        base = symbol.removesuffix(".HK")
        if base.isdecimal():
            symbol = f"{base.zfill(4)}.HK"
    return symbol


def _safe_text(value: str | None, fallback: str) -> str:
    if value is None:
        return fallback
    normalized = value.strip()
    return normalized or fallback


def build_records(
    csv_text: str,
    market: str,
    source: str,
    mapping: CsvMapping,
) -> list[dict[str, object]]:
    reader = csv.DictReader(StringIO(csv_text))
    records = []
    seen_symbols = set()
    for row in reader:
        symbol = _normalize_symbol(row.get(mapping.symbol, ""), market)
        excluded_symbols = EXCLUDED_SYMBOLS.get(source, set())
        if not symbol or symbol in seen_symbols or symbol in excluded_symbols:
            continue
        name = _safe_text(row.get(mapping.name), symbol)
        industry = _safe_text(row.get(mapping.industry), "Unknown")
        records.append({
            "symbol": symbol,
            "name": name,
            "industry": industry,
            "market": market,
            "source": source,
            "active": True,
        })
        seen_symbols.add(symbol)
    return records


def build_asx200_records() -> tuple[list[dict[str, object]], str]:
    try:
        dates = json.loads(_read_text(f"{OPEN_ASX_BASE_URL}/dates.json"))
        snapshots = json.loads(_read_text(f"{OPEN_ASX_BASE_URL}/snapshots.json"))
    except Exception:
        if not os.path.exists(LOCAL_ASX200_FALLBACK):
            raise
        return (
            build_records(
                _read_text(LOCAL_ASX200_FALLBACK),
                "AU",
                "ASX200",
                CsvMapping(
                    symbol="Symbol",
                    name="Name",
                    industry="Industry",
                ),
            ),
            LOCAL_ASX200_FALLBACK,
        )
    if not isinstance(dates, list) or not isinstance(snapshots, dict):
        raise RuntimeError("OpenASX returned an invalid response.")

    for snapshot_date in sorted(dates, reverse=True):
        companies = snapshots.get(snapshot_date)
        if not isinstance(companies, list) or not companies:
            continue

        records = []
        seen_symbols = set()
        for company in companies[:200]:
            if not isinstance(company, dict):
                continue
            symbol = _normalize_symbol(str(company.get("ticker", "")), "AU")
            excluded_symbols = EXCLUDED_SYMBOLS["ASX200"]
            if not symbol or symbol in seen_symbols or symbol in excluded_symbols:
                continue
            records.append({
                "symbol": symbol,
                "name": _safe_text(
                    str(company.get("name", "")),
                    symbol,
                ),
                "industry": _safe_text(
                    str(company.get("sector", "")),
                    "Unknown",
                ),
                "market": "AU",
                "source": "ASX200",
                "active": True,
            })
            seen_symbols.add(symbol)
        if records:
            return records, snapshot_date

    raise RuntimeError("OpenASX did not return an ASX200 snapshot.")


def build_preset_records(preset: str) -> tuple[list[dict[str, object]], str]:
    if preset == "SP500":
        return (
            build_records(
                _read_text(SP500_CONSTITUENTS_URL),
                "US",
                "SP500",
                CsvMapping(
                    symbol="Symbol",
                    name="Security",
                    industry="GICS Sector",
                ),
            ),
            SP500_CONSTITUENTS_URL,
        )
    if preset == "ASX200":
        return build_asx200_records()
    raise RuntimeError(f"Unsupported preset: {preset}")


def _chunked(records: list[dict[str, object]], size: int):
    for index in range(0, len(records), size):
        yield records[index:index + size]


def sync_records(records: list[dict[str, object]]) -> None:
    url = os.environ.get("SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_KEY")
    )
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before syncing."
        )

    client = create_client(url, key)
    for batch in _chunked(records, 500):
        client.table("top_picks_universe").upsert(
            batch,
            on_conflict="symbol",
        ).execute()

    sources = sorted({
        str(record["source"])
        for record in records
        if "source" in record
    })
    for source in sources:
        active_symbols = {
            str(record["symbol"])
            for record in records
            if record.get("source") == source
        }
        response = (
            client.table("top_picks_universe")
            .select("symbol")
            .eq("source", source)
            .eq("active", True)
            .execute()
        )
        stale_symbols = [
            row["symbol"]
            for row in getattr(response, "data", [])
            if isinstance(row, dict)
            and isinstance(row.get("symbol"), str)
            and row["symbol"] not in active_symbols
        ]
        for batch in _chunked(stale_symbols, 500):
            (
                client.table("top_picks_universe")
                .update({"active": False})
                .in_("symbol", batch)
                .execute()
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync an external index CSV into Top Picks universe.",
    )
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--csv", help="CSV file path or URL.")
    source_group.add_argument("--preset", choices=sorted(VALID_PRESETS))
    parser.add_argument("--market", choices=sorted(VALID_MARKETS))
    parser.add_argument("--source", choices=sorted(VALID_SOURCES))
    parser.add_argument("--symbol-column", default="Symbol")
    parser.add_argument("--name-column", default="Name")
    parser.add_argument("--industry-column", default="Industry")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the normalized row count without writing to Supabase.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_label = args.source or args.preset
    source_detail = None
    if args.preset:
        records, source_detail = build_preset_records(args.preset)
    else:
        if not args.market or not args.source:
            raise RuntimeError("--csv requires --market and --source.")
        records = build_records(
            _read_text(args.csv),
            args.market,
            args.source,
            CsvMapping(
                symbol=args.symbol_column,
                name=args.name_column,
                industry=args.industry_column,
            ),
        )
    if args.dry_run:
        detail = f" from {source_detail}" if source_detail else ""
        print(f"Prepared {len(records)} {source_label} records{detail}.")
        return 0
    sync_records(records)
    detail = f" from {source_detail}" if source_detail else ""
    print(f"Synced {len(records)} {source_label} records{detail}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
