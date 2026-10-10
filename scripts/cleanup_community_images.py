"""Run one bounded batch of server-authorized Community image cleanup tickets."""

import argparse
import json
import os
from pathlib import Path
import re
import sys

from supabase import ClientOptions, create_client


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "server"))

from src.supabase_client import (  # noqa: E402
    SupabaseConfigurationError,
    _validate_supabase_configuration,
)


MAX_BATCH_SIZE = 100
BUCKET_ID = "comment-images"
UUID_PATTERN = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
OWNER_PATTERN = re.compile(UUID_PATTERN)
IMAGE_PATH_PATTERN = re.compile(
    rf"(?:posts|comments/{UUID_PATTERN})/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)"
)
DISPATCH_STATES = frozenset({"ready", "absent", "owner_mismatch", "referenced"})


def create_cleanup_client():
    """Use an explicit server credential, without falling back to SUPABASE_KEY."""
    url, service_key = _validate_supabase_configuration(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY"),
    )
    if service_key.casefold() == "your_supabase_service_role_key":
        raise SupabaseConfigurationError("Cleanup service credential is invalid.")
    return create_client(
        url,
        service_key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            postgrest_client_timeout=10,
            storage_client_timeout=10,
        ),
    )


def _valid_id(value):
    return type(value) is int and 0 < value < 2**63


def _valid_limit(limit):
    return type(limit) is int and 1 <= limit <= MAX_BATCH_SIZE


def _rpc(client, name, **params):
    return client.rpc(name, params).execute().data


def _record_failure(client, summary, ticket_id, code):
    summary["failed"] += 1
    try:
        _rpc(client, "community_image_cleanup_error", p_id=ticket_id, p_code=code)
    except Exception:
        # A diagnostic failure must not hide the original failure or stop other IDs.
        summary["diagnostic_failures"] += 1


def _valid_dispatch(row, ticket_id):
    if not isinstance(row, dict) or not _valid_id(row.get("id")) or row["id"] != ticket_id:
        return False
    name, owner, state = row.get("object_name"), row.get("owner_id"), row.get("state")
    return (
        row.get("bucket_id") == BUCKET_ID
        and isinstance(name, str)
        and IMAGE_PATH_PATTERN.fullmatch(name) is not None
        and isinstance(owner, str)
        and OWNER_PATTERN.fullmatch(owner) is not None
        and isinstance(state, str)
        and state in DISPATCH_STATES
    )


def _cleanup_ticket(client, summary, ticket_id):
    try:
        rows = _rpc(client, "community_image_cleanup_dispatch", p_id=ticket_id)
    except Exception:
        _record_failure(client, summary, ticket_id, "dispatch_failed")
        return
    if rows == []:
        # A ticket removed between list and dispatch no longer needs work.
        summary["skipped"] += 1
        return
    if not isinstance(rows, list) or len(rows) != 1 or not _valid_dispatch(rows[0], ticket_id):
        _record_failure(client, summary, ticket_id, "invalid_dispatch")
        return

    row = rows[0]
    if row["state"] in {"owner_mismatch", "referenced"}:
        _record_failure(client, summary, ticket_id, row["state"])
        return
    if row["state"] == "ready":
        try:
            removed = client.storage.from_(BUCKET_ID).remove([row["object_name"]])
            if not isinstance(removed, list) or not all(isinstance(item, dict) for item in removed):
                raise ValueError("Invalid Storage response.")
        except Exception:
            _record_failure(client, summary, ticket_id, "storage_remove_failed")
            return

    # Storage may return [] when an object is already absent. ACK rechecks the
    # metadata and leaves the ticket pending if an object has been restored.
    try:
        acknowledged = _rpc(client, "community_image_cleanup_ack", p_id=ticket_id)
    except Exception:
        _record_failure(client, summary, ticket_id, "ack_failed")
        return
    if acknowledged is True:
        summary["completed"] += 1
    else:
        code = "object_restored" if acknowledged is False else "ack_failed"
        _record_failure(client, summary, ticket_id, code)


def cleanup_batch(client, limit=100):
    """Process one fair SQL-selected batch; retries happen on the next invocation."""
    if not _valid_limit(limit):
        raise ValueError("Cleanup batch size must be between 1 and 100.")
    summary = {"listed": 0, "attempted": 0, "completed": 0, "skipped": 0, "failed": 0, "diagnostic_failures": 0}
    try:
        rows = _rpc(client, "community_image_cleanup_list", p_limit=limit)
    except Exception:
        summary["failed"] = 1
        return summary
    if (
        not isinstance(rows, list)
        or len(rows) > limit
        or any(not isinstance(row, dict) or not _valid_id(row.get("id")) for row in rows)
    ):
        summary["failed"] = 1
        return summary

    summary["listed"] = len(rows)
    for ticket_id in dict.fromkeys(row["id"] for row in rows):
        summary["attempted"] += 1
        _cleanup_ticket(client, summary, ticket_id)
    return summary


class _RedactedArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        # argparse normally repeats unknown argument values, possibly user paths.
        self.exit(2, "invalid_arguments\n")


def _limit_argument(value):
    try:
        limit = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("Invalid cleanup batch size.") from None
    if not _valid_limit(limit):
        raise argparse.ArgumentTypeError("Cleanup batch size must be between 1 and 100.")
    return limit


def main(argv=None):
    parser = _RedactedArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=_limit_argument, default=MAX_BATCH_SIZE, help="Maximum tickets in this invocation (1..100; default 100).")
    args = parser.parse_args(argv)
    try:
        client = create_cleanup_client()
    except SupabaseConfigurationError:
        print("configuration_invalid", file=sys.stderr)
        return 1
    except Exception:
        print("client_failed", file=sys.stderr)
        return 1
    summary = cleanup_batch(client, limit=args.limit)
    print(json.dumps(summary, sort_keys=True))
    return int(summary["failed"] > 0)


if __name__ == "__main__":
    raise SystemExit(main())
