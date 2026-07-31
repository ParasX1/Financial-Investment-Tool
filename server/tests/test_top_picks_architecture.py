from ast import Import, ImportFrom, parse, walk
from pathlib import Path


SERVER_SOURCE = Path(__file__).resolve().parents[1] / "src"


def imported_modules(path):
    tree = parse(path.read_text(encoding="utf-8"))
    modules = []
    for node in walk(tree):
        if isinstance(node, Import):
            modules.extend(alias.name for alias in node.names)
        elif isinstance(node, ImportFrom):
            modules.append(node.module or "")
    return modules


def test_top_picks_domain_package_is_flask_free():
    modules = list((SERVER_SOURCE / "top_picks").glob("*.py"))

    assert modules
    for module in modules:
        assert not any(
            imported == "flask" or imported.startswith("flask.")
            for imported in imported_modules(module)
        ), f"{module.name} must not depend on Flask"


def test_top_picks_route_contains_no_financial_calculations():
    route = SERVER_SOURCE / "routes" / "top_picks.py"
    source = route.read_text(encoding="utf-8")

    assert "from ..metrics import" not in source
    assert "annualized_active_return" not in source
    assert "tracking_error" not in source


def test_top_picks_domain_does_not_depend_on_legacy_metric_layers():
    modules = list((SERVER_SOURCE / "top_picks").glob("*.py"))

    assert modules
    for module in modules:
        source = module.read_text(encoding="utf-8")
        assert "from ..metrics import" not in source
        assert "from ..analytics." not in source
