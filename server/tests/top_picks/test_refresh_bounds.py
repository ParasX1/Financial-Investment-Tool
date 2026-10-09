from concurrent.futures import ThreadPoolExecutor
from queue import Empty

import pytest

from src.top_picks.events import SnapshotUpdateHub, SubscriptionLimitError


def test_peer_limit_is_atomic_and_cleanup_only_releases_its_own_slot():
    hub = SnapshotUpdateHub(max_subscribers=8, max_per_client=2)

    def subscribe(_):
        try:
            return hub.subscribe("1Y", client_id="peer")
        except SubscriptionLimitError:
            return None

    with ThreadPoolExecutor(max_workers=12) as workers:
        subscriptions = list(workers.map(subscribe, range(12)))
    admitted = [subscription for subscription in subscriptions if subscription]
    assert len(admitted) == 2
    other = hub.subscribe("1M", client_id="other")
    admitted[0].close()
    replacement = hub.subscribe("1D", client_id="peer")
    admitted[0].close()
    with pytest.raises(SubscriptionLimitError):
        hub.subscribe("1Y", client_id="peer")
    for subscription in [admitted[1], replacement, other]:
        subscription.close()
    assert not hub.has_subscribers


def test_process_limit_includes_all_windows_and_peers():
    hub = SnapshotUpdateHub(max_subscribers=2, max_per_client=2)

    def subscribe(index):
        try:
            return hub.subscribe("1Y" if index % 2 else "1M", client_id=str(index))
        except SubscriptionLimitError:
            return None

    with ThreadPoolExecutor(max_workers=16) as workers:
        admitted = [subscription for subscription in workers.map(subscribe, range(32)) if subscription]
    assert len(admitted) == 2
    first, second = admitted
    with pytest.raises(SubscriptionLimitError):
        hub.subscribe("1D", client_id="c")
    first.close()
    third = hub.subscribe("1D", client_id="c")
    second.close()
    third.close()


def test_expired_slots_are_reclaimed_before_admission_and_receive_no_updates():
    now = [0]
    hub = SnapshotUpdateHub(max_subscribers=1, max_per_client=1,
                            max_lifetime_seconds=30, clock=lambda: now[0])
    old = hub.subscribe("1Y", client_id="peer")
    now[0] = 30
    replacement = hub.subscribe("1Y", client_id="peer")
    assert old.remaining_seconds == 0
    hub.publish("1Y", "fresh")
    with pytest.raises(Empty):
        old.get(timeout=0)
    assert replacement.get(timeout=0)["generatedAt"] == "fresh"
    old.close()
    assert hub.has_subscribers
    replacement.close()


def test_default_peer_budget_admits_three_tabs_and_limits_attackers():
    hub = SnapshotUpdateHub()
    subscriptions = [hub.subscribe(window, client_id="shared-nat")
                     for _ in range(3) for window in ["1Y", "1M"]]
    for _ in range(10):
        subscriptions.append(hub.subscribe("1Y", client_id="shared-nat"))
    with pytest.raises(SubscriptionLimitError):
        hub.subscribe("1Y", client_id="shared-nat")
    for subscription in subscriptions:
        subscription.close()


@pytest.mark.parametrize("cap, expected_legitimate, expected_extra", [(4, 4, 0), (16, 6, 10)])
def test_peer_budget_comparison_uses_same_three_tab_and_excess_workload(cap, expected_legitimate, expected_extra):
    hub = SnapshotUpdateHub(max_per_client=cap)
    admitted = []
    legitimate = 0
    for index in range(22):
        try:
            admitted.append(hub.subscribe("1Y" if index % 2 else "1M", client_id="shared-nat"))
            if index < 6:
                legitimate += 1
        except SubscriptionLimitError:
            pass
    assert legitimate == expected_legitimate
    assert len(admitted) - legitimate == expected_extra
    assert len(admitted) == cap
    for subscription in admitted:
        subscription.close()
