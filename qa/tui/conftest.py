"""TUI-suite fixtures.

Drives `claytab tui` under a pseudo-terminal via pexpect, so we can send
key presses and assert on rendered screen content (after stripping ANSI
escape sequences).
"""
from __future__ import annotations

import os
import re
import secrets
from pathlib import Path
from typing import Iterator

import pytest

try:
    import pexpect  # type: ignore
except ImportError:  # pragma: no cover
    pexpect = None  # type: ignore


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CLI = REPO_ROOT / "cli" / "claytab"

ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]")


def strip_ansi(s: str) -> str:
    return ANSI_RE.sub("", s)


@pytest.fixture(scope="session")
def cli_binary() -> str:
    path = os.environ.get("CLAYTAB_BIN", str(DEFAULT_CLI))
    if not Path(path).exists():
        pytest.skip(f"CLI binary not found at {path}")
    return path


@pytest.fixture
def tui_session(cli_binary, tmp_path, api_url) -> Iterator["pexpect.spawn"]:
    """Spawn `claytab tui` in a fresh PTY with an isolated config.

    Yields a `pexpect.spawn` instance. Caller drives via sendline / send.
    """
    if pexpect is None:
        pytest.skip("pexpect not installed (pip install pexpect)")

    cfg_home = tmp_path / "cfg"
    cfg_home.mkdir()
    room = f"tui-qa-{secrets.token_hex(4)}"

    import subprocess
    # Pre-configure server/room so TUI starts pointing at our backend.
    subprocess.run(
        [cli_binary, "config", "--server", api_url, "--room", room],
        env={**os.environ, "XDG_CONFIG_HOME": str(cfg_home), "HOME": str(tmp_path)},
        capture_output=True,
        timeout=10,
    )

    child = pexpect.spawn(
        cli_binary,
        ["tui"],
        env={**os.environ, "XDG_CONFIG_HOME": str(cfg_home), "HOME": str(tmp_path), "TERM": "xterm-256color"},
        timeout=10,
        encoding="utf-8",
        dimensions=(40, 120),
    )
    yield child
    try:
        if child.isalive():
            child.send("q")  # most TUIs exit on 'q'
            child.expect(pexpect.EOF, timeout=3)
    except Exception:
        pass
    finally:
        if child.isalive():
            child.terminate(force=True)


@pytest.fixture
def render(tui_session):
    """Snapshot helper: read whatever is currently in the buffer and strip ANSI."""
    def _render(timeout: float = 1.5) -> str:
        try:
            tui_session.expect(r".+", timeout=timeout)
        except Exception:
            pass
        before = tui_session.before or ""
        after = tui_session.after or ""
        return strip_ansi(before + after)
    return _render
