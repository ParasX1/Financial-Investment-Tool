from concurrent.futures import ThreadPoolExecutor

from src.quant_analysis.rate_limit import FixedWindowRateLimiter


def test_fixed_window_limiter_blocks_then_resets_with_retry_after():
    now = [100.0]
    limiter = FixedWindowRateLimiter(
        limit=2,
        window_seconds=60,
        clock=lambda: now[0],
    )

    assert limiter.check("127.0.0.1").allowed is True
    assert limiter.check("127.0.0.1").allowed is True
    denied = limiter.check("127.0.0.1")
    assert denied.allowed is False
    assert denied.retry_after == 60

    now[0] = 160.0
    assert limiter.check("127.0.0.1").allowed is True


def test_fixed_window_limiter_is_thread_safe():
    limiter = FixedWindowRateLimiter(
        limit=20,
        window_seconds=60,
        clock=lambda: 100.0,
    )

    with ThreadPoolExecutor(max_workers=8) as executor:
        decisions = list(executor.map(
            lambda _: limiter.check("same-client").allowed,
            range(40),
        ))

    assert decisions.count(True) == 20
    assert decisions.count(False) == 20


def test_fixed_window_limiter_bounds_tracked_client_capacity():
    now = [100.0]
    limiter = FixedWindowRateLimiter(
        limit=20,
        window_seconds=60,
        max_keys=2,
        clock=lambda: now[0],
    )

    limiter.check("one")
    now[0] += 1
    limiter.check("two")
    now[0] += 1
    limiter.check("three")

    assert limiter.tracked_key_count == 2
