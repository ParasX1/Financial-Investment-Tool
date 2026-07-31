from ast import FunctionDef, Import, ImportFrom, parse, walk
from pathlib import Path

from src.server import create_app


SERVER_SOURCE = Path(__file__).resolve().parents[1] / "src"
LEGACY_METRIC_PATHS = {
    "/api/alphacomparison",
    "/api/betaanalysis",
    "/api/cumulativereturncomparison",
    "/api/efficientfrontiervisualization",
    "/api/marketcorrelationanalysis",
    "/api/maxdrawdownanalysis",
    "/api/sharperatiomatrix",
    "/api/sortinoratiovisualization",
    "/api/valueatriskanalysis",
    "/api/volatilityanalysis",
}


def imported_modules(path):
    tree = parse(path.read_text(encoding="utf-8"))
    modules = []
    for node in walk(tree):
        if isinstance(node, Import):
            modules.extend(alias.name for alias in node.names)
        elif isinstance(node, ImportFrom):
            modules.append(node.module or "")
    return modules


def test_application_factory_registers_focused_blueprints():
    app = create_app({"TESTING": True})

    assert {
        "legacy_metrics",
        "legacy_stocks",
        "market_data",
        "metrics",
    }.issubset(app.blueprints)


def test_server_factory_preserves_all_public_market_endpoint_rules():
    app = create_app({"TESTING": True})
    rules = {
        (rule.rule, frozenset(rule.methods - {"HEAD", "OPTIONS"}))
        for rule in app.url_map.iter_rules()
    }

    assert ("/api/metrics/<metric_type>", frozenset({"POST"})) in rules
    assert ("/api/fetch_data", frozenset({"GET"})) in rules
    assert ("/api/stocks/get", frozenset({"POST"})) in rules
    assert ("/api/stocks/set", frozenset({"POST"})) in rules
    assert {
        (path, frozenset({"GET"}))
        for path in LEGACY_METRIC_PATHS
    }.issubset(rules)


def test_legacy_metrics_compatibility_can_be_disabled_independently():
    app = create_app({
        "TESTING": True,
        "LEGACY_METRICS_COMPATIBILITY_ENABLED": False,
    })
    rules = {
        (rule.rule, frozenset(rule.methods - {"HEAD", "OPTIONS"}))
        for rule in app.url_map.iter_rules()
    }

    assert "legacy_metrics" not in app.blueprints
    assert not {
        (path, frozenset({"GET"}))
        for path in LEGACY_METRIC_PATHS
    }.intersection(rules)
    assert ("/api/metrics/<metric_type>", frozenset({"POST"})) in rules


def test_server_module_is_an_application_factory_not_a_route_container():
    source = (SERVER_SOURCE / "server.py").read_text(encoding="utf-8")

    assert "def create_app(" in source
    assert "@app.route" not in source


def test_server_module_is_a_narrow_composition_root():
    server_module = SERVER_SOURCE / "server.py"
    tree = parse(server_module.read_text(encoding="utf-8"))
    top_level_functions = [
        node.name for node in tree.body if isinstance(node, FunctionDef)
    ]

    assert top_level_functions == ["create_app"]
    assert not {
        "analytics.metric_contract",
        "metrics",
        "supabase_client",
        "top_picks.repository",
        "top_picks.service",
    }.intersection(imported_modules(server_module))


def test_server_composes_legacy_metrics_through_compatibility_boundary():
    server_module = SERVER_SOURCE / "server.py"
    modules = imported_modules(server_module)

    assert "compat.legacy_metrics" in modules
    assert "routes.legacy_metrics" not in modules


def test_normal_metric_path_does_not_depend_on_compatibility_package():
    normal_metric_modules = [
        SERVER_SOURCE / "routes" / "metrics.py",
        SERVER_SOURCE / "analytics" / "metric_contract.py",
        SERVER_SOURCE / "analytics" / "metric_service.py",
    ]

    for metric_module in normal_metric_modules:
        assert not any(
            module == "compat" or module.startswith("compat.")
            for module in imported_modules(metric_module)
        )


def test_route_modules_do_not_import_financial_calculators():
    route_root = SERVER_SOURCE / "routes"
    route_files = list(route_root.glob("*.py"))

    assert route_files
    for route_file in route_files:
        source = route_file.read_text(encoding="utf-8")
        assert "from ..metrics import" not in source
        assert "from src.metrics import" not in source


def test_calculation_and_analytics_modules_are_flask_free():
    calculation_modules = [SERVER_SOURCE / "metrics.py"]
    calculation_modules.extend((SERVER_SOURCE / "analytics").glob("*.py"))

    assert len(calculation_modules) > 1
    for module in calculation_modules:
        assert not any(
            imported == "flask" or imported.startswith("flask.")
            for imported in imported_modules(module)
        ), f"{module.name} must not depend on Flask"
