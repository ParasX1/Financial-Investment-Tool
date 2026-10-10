"""Cleanup orchestration controls; external Storage/SQL behavior is tested separately."""

import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

import pytest


SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "cleanup_community_images.py"
OWNER_ID = "12345678-1234-4321-8123-123456789abc"
POST_ID = "87654321-4321-4321-8123-123456789abc"
DEFAULT_IDS = object()


@pytest.fixture(scope="module")
def cleanup():
    spec = importlib.util.spec_from_file_location("cleanup_community_images", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def dispatch(ticket_id=1, **changes):
    row = {
        "id": ticket_id,
        "bucket_id": "comment-images",
        "object_name": "posts/photo_1.png",
        "owner_id": OWNER_ID,
        "state": "ready",
    }
    row.update(changes)
    return [row]


class FakeClient:
    def __init__(self, ids=DEFAULT_IDS, dispatches=None, removals=None, acknowledgements=None, error_failure=None):
        self.ids = [{"id": 1}] if ids is DEFAULT_IDS else ids
        self.dispatches = {1: dispatch()} if dispatches is None else dispatches
        self.removals = [] if removals is None else list(removals)
        self.acknowledgements = {} if acknowledgements is None else acknowledgements
        self.error_failure = error_failure
        self.calls = []
        self.storage = self

    def rpc(self, name, params):
        def execute():
            self.calls.append((name, params))
            if name == "community_image_cleanup_list":
                value = self.ids
            elif name == "community_image_cleanup_dispatch":
                value = self.dispatches[params["p_id"]]
            elif name == "community_image_cleanup_ack":
                value = self.acknowledgements.get(params["p_id"], True)
            elif name == "community_image_cleanup_error":
                value = self.error_failure
            else:
                raise AssertionError("Unknown RPC")
            if isinstance(value, BaseException):
                raise value
            return SimpleNamespace(data=value)

        return SimpleNamespace(execute=execute)

    def from_(self, bucket):
        self.calls.append(("bucket", bucket))
        return self

    def remove(self, paths):
        self.calls.append(("remove", paths))
        value = self.removals.pop(0) if self.removals else []
        if isinstance(value, BaseException):
            raise value
        return value


def failures(client):
    return [params["p_code"] for name, params in client.calls if name == "community_image_cleanup_error"]


def test_ready_removes_through_storage_before_acknowledging(cleanup):
    client = FakeClient(removals=[[{"name": "posts/photo_1.png"}]])

    result = cleanup.cleanup_batch(client)

    assert result == {"listed": 1, "attempted": 1, "completed": 1, "skipped": 0, "failed": 0, "diagnostic_failures": 0}
    assert client.calls == [
        ("community_image_cleanup_list", {"p_limit": 100}),
        ("community_image_cleanup_dispatch", {"p_id": 1}),
        ("bucket", "comment-images"),
        ("remove", ["posts/photo_1.png"]),
        ("community_image_cleanup_ack", {"p_id": 1}),
    ]


def test_absent_dispatch_acknowledges_without_a_storage_request(cleanup):
    client = FakeClient(dispatches={1: dispatch(state="absent")})

    result = cleanup.cleanup_batch(client, limit=4)

    assert result["completed"] == 1
    assert client.calls == [
        ("community_image_cleanup_list", {"p_limit": 4}),
        ("community_image_cleanup_dispatch", {"p_id": 1}),
        ("community_image_cleanup_ack", {"p_id": 1}),
    ]


def test_empty_successful_remove_is_acknowledged_and_sql_still_confirms_absence(cleanup):
    client = FakeClient(removals=[[]])

    result = cleanup.cleanup_batch(client)

    assert result["completed"] == 1
    assert client.calls[-1] == ("community_image_cleanup_ack", {"p_id": 1})


def test_valid_comment_path_is_supported(cleanup):
    path = f"comments/{POST_ID}/photo-test.webp"
    client = FakeClient(dispatches={1: dispatch(object_name=path)})

    assert cleanup.cleanup_batch(client)["completed"] == 1
    assert ("remove", [path]) in client.calls


def test_storage_failure_keeps_ticket_unacknowledged_then_retry_succeeds(cleanup):
    client = FakeClient(removals=[RuntimeError("SECRET user/path"), []])

    first = cleanup.cleanup_batch(client)
    assert first["failed"] == 1
    assert failures(client) == ["storage_remove_failed"]
    assert not any(name == "community_image_cleanup_ack" for name, _ in client.calls)

    second = cleanup.cleanup_batch(client)
    assert second["completed"] == 1
    assert second["failed"] == 0


def test_crash_after_storage_delete_can_resume_as_absent_without_deleting_again(cleanup):
    client = FakeClient(acknowledgements={1: KeyboardInterrupt()})

    with pytest.raises(KeyboardInterrupt):
        cleanup.cleanup_batch(client)
    assert ("remove", ["posts/photo_1.png"]) in client.calls
    assert failures(client) == []

    client.dispatches[1] = dispatch(state="absent")
    client.acknowledgements[1] = True
    result = cleanup.cleanup_batch(client)

    assert result["completed"] == 1
    assert sum(name == "remove" for name, _ in client.calls) == 1


def test_duplicate_ids_are_attempted_once_and_missing_ticket_is_a_noop(cleanup):
    client = FakeClient(ids=[{"id": 1}, {"id": 1}, {"id": 2}], dispatches={1: dispatch(), 2: []})

    result = cleanup.cleanup_batch(client)

    assert result == {"listed": 3, "attempted": 2, "completed": 1, "skipped": 1, "failed": 0, "diagnostic_failures": 0}
    assert sum(name == "remove" for name, _ in client.calls) == 1
    assert ("community_image_cleanup_ack", {"p_id": 2}) not in client.calls


def test_empty_batch_is_a_noop(cleanup):
    client = FakeClient(ids=[])

    assert cleanup.cleanup_batch(client) == {"listed": 0, "attempted": 0, "completed": 0, "skipped": 0, "failed": 0, "diagnostic_failures": 0}
    assert client.calls == [("community_image_cleanup_list", {"p_limit": 100})]


@pytest.mark.parametrize("state", ["owner_mismatch", "referenced"])
def test_foreign_owner_and_live_reference_fail_closed(cleanup, state):
    client = FakeClient(dispatches={1: dispatch(state=state)})

    assert cleanup.cleanup_batch(client)["failed"] == 1
    assert failures(client) == [state]
    assert not any(name in {"bucket", "remove", "community_image_cleanup_ack"} for name, _ in client.calls)


@pytest.mark.parametrize("change", [
    {"id": 2}, {"id": True}, {"bucket_id": "avatars"}, {"owner_id": "invalid"},
    {"owner_id": None}, {"object_name": "posts/../foreign.png"}, {"object_name": "posts/a.svg"},
    {"object_name": "posts/a.png?token=secret"}, {"object_name": "posts/a.png\n"},
    {"object_name": "comments/not-uuid/a.png"}, {"object_name": None}, {"state": "unknown"}, {"state": []},
])
def test_malformed_dispatch_never_reaches_storage_or_ack(cleanup, change):
    client = FakeClient(dispatches={1: dispatch(**change)})

    assert cleanup.cleanup_batch(client)["failed"] == 1
    assert failures(client) == ["invalid_dispatch"]
    assert not any(name in {"bucket", "remove", "community_image_cleanup_ack"} for name, _ in client.calls)


@pytest.mark.parametrize("value", [None, {}, [None], [dispatch()[0], dispatch()[0]]])
def test_invalid_dispatch_shape_fails_closed(cleanup, value):
    client = FakeClient(dispatches={1: value})

    assert cleanup.cleanup_batch(client)["failed"] == 1
    assert failures(client) == ["invalid_dispatch"]


@pytest.mark.parametrize("rows", [None, {}, [None], [{}], [{"id": "1"}], [{"id": True}], [{"id": 0}], [{"id": -1}], [{"id": 2**63}], [{"id": 1}, {"id": "bad"}]])
def test_malformed_list_is_rejected_before_any_ticket_side_effect(cleanup, rows):
    client = FakeClient(ids=rows)

    result = cleanup.cleanup_batch(client)

    assert result["failed"] == 1
    assert result["attempted"] == 0
    assert client.calls == [("community_image_cleanup_list", {"p_limit": 100})]


def test_server_returning_more_than_requested_limit_fails_closed(cleanup):
    client = FakeClient(ids=[{"id": 1}, {"id": 2}])

    assert cleanup.cleanup_batch(client, limit=1)["failed"] == 1
    assert client.calls == [("community_image_cleanup_list", {"p_limit": 1})]


def test_list_exception_fails_without_followup_rpc(cleanup):
    client = FakeClient(ids=RuntimeError("SECRET user/path"))

    assert cleanup.cleanup_batch(client)["failed"] == 1
    assert len(client.calls) == 1


def test_dispatch_failure_records_stable_code_and_continues_next_ticket(cleanup):
    client = FakeClient(ids=[{"id": 1}, {"id": 2}], dispatches={1: RuntimeError("secret"), 2: dispatch(ticket_id=2)})

    result = cleanup.cleanup_batch(client)

    assert result["failed"] == 1
    assert result["completed"] == 1
    assert failures(client) == ["dispatch_failed"]


@pytest.mark.parametrize("value", [None, {}, {"error": "secret"}, [None], ["unexpected"]])
def test_invalid_storage_result_never_acknowledges(cleanup, value):
    client = FakeClient(removals=[value])

    assert cleanup.cleanup_batch(client)["failed"] == 1
    assert failures(client) == ["storage_remove_failed"]
    assert not any(name == "community_image_cleanup_ack" for name, _ in client.calls)


@pytest.mark.parametrize("state", ["ready", "absent"])
def test_ack_false_keeps_ticket_pending_as_restored(cleanup, state):
    client = FakeClient(dispatches={1: dispatch(state=state)}, acknowledgements={1: False})

    result = cleanup.cleanup_batch(client)

    assert result["completed"] == 0
    assert result["failed"] == 1
    assert failures(client) == ["object_restored"]


@pytest.mark.parametrize("value", [RuntimeError("secret"), None, 1, "true", [True]])
def test_ack_exception_or_nonboolean_response_fails(cleanup, value):
    client = FakeClient(acknowledgements={1: value})

    assert cleanup.cleanup_batch(client)["failed"] == 1
    assert failures(client) == ["ack_failed"]


def test_error_rpc_failure_is_counted_and_does_not_abort_remaining_tickets(cleanup):
    client = FakeClient(ids=[{"id": 1}, {"id": 2}], dispatches={1: dispatch(state="owner_mismatch"), 2: dispatch(ticket_id=2)}, error_failure=RuntimeError("secret"))

    result = cleanup.cleanup_batch(client)

    assert result["completed"] == 1
    assert result["failed"] == 1
    assert result["diagnostic_failures"] == 1


@pytest.mark.parametrize("limit", [0, 101, None, True, "10"])
def test_invalid_batch_size_is_rejected_before_any_rpc(cleanup, limit):
    client = FakeClient()

    with pytest.raises(ValueError):
        cleanup.cleanup_batch(client, limit=limit)
    assert client.calls == []


def test_client_requires_explicit_service_role_environment_and_no_generic_fallback(cleanup, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "generic-anon-key")
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    calls = []
    monkeypatch.setattr(cleanup, "create_client", lambda *args, **kwargs: calls.append(args))

    with pytest.raises(cleanup.SupabaseConfigurationError):
        cleanup.create_cleanup_client()
    assert calls == []


def test_client_reuses_configuration_validator_and_explicit_service_key(cleanup, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", " https://project.supabase.co ")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", " server-service-key ")
    monkeypatch.setenv("SUPABASE_KEY", "ignored-anon-key")
    calls = []
    real_validator = cleanup._validate_supabase_configuration

    def validate(url, key):
        calls.append(("validate", url, key))
        return real_validator(url, key)

    client_options = []

    def create(url, key, **options):
        calls.append(("create", url, key))
        client_options.append(options["options"])
        return "client"

    monkeypatch.setattr(cleanup, "_validate_supabase_configuration", validate)
    monkeypatch.setattr(cleanup, "create_client", create)

    assert cleanup.create_cleanup_client() == "client"
    assert calls == [("validate", " https://project.supabase.co ", " server-service-key "), ("create", "https://project.supabase.co", "server-service-key")]
    assert client_options[0].auto_refresh_token is False
    assert client_options[0].persist_session is False
    assert client_options[0].postgrest_client_timeout == 10
    assert client_options[0].storage_client_timeout == 10


@pytest.mark.parametrize("url,key", [(None, "service-key"), ("not-a-url", "service-key"), ("https://project.supabase.co", " "), ("your_supabase_project_url", "service-key"), ("https://project.supabase.co", "your_supabase_service_role_key")])
def test_invalid_configuration_is_not_used_to_create_a_client(cleanup, monkeypatch, url, key):
    if url is None:
        monkeypatch.delenv("SUPABASE_URL", raising=False)
    else:
        monkeypatch.setenv("SUPABASE_URL", url)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", key)
    monkeypatch.setattr(cleanup, "create_client", lambda *args, **kwargs: pytest.fail("Invalid config reached client creation"))

    with pytest.raises(cleanup.SupabaseConfigurationError):
        cleanup.create_cleanup_client()


def test_cli_prints_only_summary_counts_and_returns_failure_status(cleanup, monkeypatch, capsys):
    client = FakeClient(removals=[RuntimeError("SECRET posts/private.png")])
    monkeypatch.setattr(cleanup, "create_cleanup_client", lambda: client)

    assert cleanup.main(["--limit", "3"]) == 1
    output = capsys.readouterr()
    assert json.loads(output.out)["failed"] == 1
    assert output.err == ""
    assert "SECRET" not in output.out
    assert "private.png" not in output.out


def test_cli_empty_batch_exits_successfully(cleanup, monkeypatch, capsys):
    monkeypatch.setattr(cleanup, "create_cleanup_client", lambda: FakeClient(ids=[]))

    assert cleanup.main([]) == 0
    assert json.loads(capsys.readouterr().out)["attempted"] == 0


@pytest.mark.parametrize("exception,code", [("configuration", "configuration_invalid"), ("client", "client_failed")])
def test_cli_configuration_and_client_failures_are_redacted(cleanup, monkeypatch, capsys, exception, code):
    error = cleanup.SupabaseConfigurationError("SECRET") if exception == "configuration" else RuntimeError("SECRET")

    def fail():
        raise error

    monkeypatch.setattr(cleanup, "create_cleanup_client", fail)
    assert cleanup.main([]) == 1
    output = capsys.readouterr()
    assert output.out == ""
    assert output.err.strip() == code


@pytest.mark.parametrize("arguments", [["--limit", "0"], ["--limit", "101"], ["--limit", "secret"], ["--object-name", "posts/private.png"]])
def test_cli_rejects_unbounded_batches_and_arbitrary_object_arguments(cleanup, arguments, monkeypatch, capsys):
    monkeypatch.setattr(cleanup, "create_cleanup_client", lambda: pytest.fail("Invalid arguments reached client creation"))

    with pytest.raises(SystemExit) as error:
        cleanup.main(arguments)
    assert error.value.code == 2
    output = capsys.readouterr()
    assert output.out == ""
    assert output.err == "invalid_arguments\n"
