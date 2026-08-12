from src.quant_analysis.market_data import normalize_observations


def test_identical_duplicate_prices_collapse_to_one_observation():
    observations, exclusions = normalize_observations(
        [
            ("2026-01-02", 101),
            ("2026-01-01", 100),
            ("2026-01-01", 100.0),
        ],
        start_date="2026-01-01",
        end_date="2026-01-02",
    )

    assert [(item.date, item.adjusted_close) for item in observations] == [
        ("2026-01-01", 100.0),
        ("2026-01-02", 101.0),
    ]
    assert exclusions == {"duplicate": 1}


def test_conflicting_duplicate_prices_reject_the_whole_session():
    rows = [
        ("2026-01-01", 100),
        ("2026-01-01", 101),
        ("2026-01-02", 102),
    ]

    forward = normalize_observations(
        rows,
        start_date="2026-01-01",
        end_date="2026-01-02",
    )
    reverse = normalize_observations(
        list(reversed(rows)),
        start_date="2026-01-01",
        end_date="2026-01-02",
    )

    assert forward == reverse
    assert [(item.date, item.adjusted_close) for item in forward[0]] == [
        ("2026-01-02", 102.0),
    ]
    assert forward[1] == {"duplicate": 2}
