"""CLI-suite fixtures.

Spawns the `claytab` Go binary via subprocess against a real backend.
Each test gets an isolated XDG_CONFIG_HOME so config writes never leak between
runs (or pollute the user's real ~/.config/claytablet.toml).
"""
from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Callable

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CLI = REPO_ROOT / "cli" / "claytab"


@pytest.fixture(scope="session")
def cli_binary() -> str:
    """Resolve which claytab binary to test against.

    Override with CLAYTAB_BIN env var (e.g. for a freshly built binary in CI).
    """
    path = os.environ.get("CLAYTAB_BIN", str(DEFAULT_CLI))
    if not Path(path).exists():
        pytest.skip(f"CLI binary not found at {path}; build with `cd cli && go build -o claytab .`")
    return path


@pytest.fixture
def cli_config_home(tmp_path: Path) -> Path:
    """Isolated XDG_CONFIG_HOME — each test has a fresh config."""
    home = tmp_path / "cfg"
    home.mkdir()
    return home


@pytest.fixture
def run_cli(cli_binary: str, cli_config_home: Path) -> Callable:
    """Run `claytab <args>` with isolated config, return CompletedProcess.

    Usage:
        result = run_cli("send", "hello")
        assert result.returncode == 0
        assert "ok" in result.stdout.lower()
    """
    def _run(*args: str, input_text: str | None = None, timeout: int = 15) -> subprocess.CompletedProcess:
        env = {
            **os.environ,
            "XDG_CONFIG_HOME": str(cli_config_home),
            "HOME": str(cli_config_home.parent),
        }
        return subprocess.run(
            [cli_binary, *args],
            input=input_text,
            capture_output=True,
            text=True,
            env=env,
            timeout=timeout,
        )
    return _run


@pytest.fixture
def configured_cli(run_cli, api_url):
    """Returns a run_cli that has had `config --server <api> --room <random>` applied."""
    import secrets
    room = f"cli-qa-{secrets.token_hex(4)}"
    res = run_cli("config", "--server", api_url, "--room", room)
    assert res.returncode == 0, f"config failed: {res.stderr}\n{res.stdout}"
    return run_cli, room
