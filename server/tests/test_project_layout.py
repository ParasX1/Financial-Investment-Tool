from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[1]


def test_exploratory_notebooks_stay_out_of_runtime_source():
    notebooks = list((SERVER_ROOT / "notebooks").glob("*.ipynb"))
    source_notebooks = list((SERVER_ROOT / "src").glob("*.ipynb"))

    assert SERVER_ROOT / "notebooks" / "metrics-exploration.ipynb" in notebooks
    assert source_notebooks == []
