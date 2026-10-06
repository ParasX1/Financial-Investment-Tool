"""Export local Top Picks snapshots and history into the versioned seed archive."""

import argparse
from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "server"))

from src.top_picks.bootstrap import create_seed_archive  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=REPO_ROOT / "server/.cache/top-picks-snapshot-cache.json",
    )
    parser.add_argument("--history", type=Path)
    parser.add_argument(
        "--output", type=Path, default=REPO_ROOT / "data/top-picks-seed.zip"
    )
    args = parser.parse_args()
    history_path = args.history or Path(f"{args.snapshot}.history.sqlite3")
    manifest = create_seed_archive(args.snapshot, history_path, args.output)
    window_rows = ", ".join(
        f"{window}:{details['rows']}"
        for window, details in sorted(manifest["windows"].items())
    )
    print(
        f"Windows (rows): {window_rows}; "
        f"history symbols: {manifest['history']['symbols']}"
    )
    print(
        f"Size: {args.output.stat().st_size / (1024 * 1024):.2f} MiB; "
        f"created: {manifest['createdAt']}"
    )


if __name__ == "__main__":
    main()
