from pathlib import Path
import re


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SERVER_ROOT = REPOSITORY_ROOT / "server"


def read_requirements(path):
    return {
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }


def requirement_names(requirements):
    return {
        re.split(r"[<>=!~]", requirement, maxsplit=1)[0].strip()
        for requirement in requirements
        if not requirement.startswith("-r ")
    }


def test_backend_dependencies_are_owned_by_the_server_package():
    runtime_requirements = read_requirements(SERVER_ROOT / "requirements.txt")
    runtime_names = requirement_names(runtime_requirements)
    development_requirements = read_requirements(
        SERVER_ROOT / "requirements-dev.txt"
    )

    assert not (REPOSITORY_ROOT / "requirements.txt").exists()
    assert {
        "flask",
        "flask-cors",
        "numpy",
        "pandas",
        "supabase",
        "yfinance",
    }.issubset(runtime_names)
    assert "pytest" not in runtime_requirements
    assert "-r requirements.txt" in development_requirements
    assert any(item.startswith("pytest") for item in development_requirements)
    assert any(item.startswith("flake8") for item in development_requirements)
    assert any(item.startswith("autopep8") for item in development_requirements)
    assert any(item.startswith("matplotlib") for item in development_requirements)


def test_backend_ci_installs_the_server_development_manifest():
    workflow = (
        REPOSITORY_ROOT / ".github" / "workflows" / "python-app.yml"
    ).read_text(encoding="utf-8")

    assert "pip install -r requirements-dev.txt" in workflow
    assert "../requirements.txt" not in workflow
