"""Desktop (Tauri) fixtures.

Two test surfaces:
  1. **Frontend bundle** — the React app inside desktop/dist/. Can be served via
     a throwaway Python http.server and exercised with Playwright like any SPA.
  2. **Tauri binary** — `desktop/src-tauri/target/debug/` (or release/). Full E2E
     would need tauri-driver + webkit2gtk-driver + Xvfb. We mark those tests
     `needs_xvfb` and skip when no DISPLAY is set, but provide a smoke test
     that just verifies the binary launches and exits cleanly with --help.
"""
from __future__ import annotations

import os
import socket
import subprocess
import time
from pathlib import Path
from typing import Iterator

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
DESKTOP_DIST = REPO_ROOT / "desktop" / "dist"
TAURI_TARGET = REPO_ROOT / "desktop" / "src-tauri" / "target"


def _find_free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


@pytest.fixture(scope="session")
def desktop_dist_dir() -> Path:
    if not DESKTOP_DIST.exists() or not (DESKTOP_DIST / "index.html").exists():
        pytest.skip(
            f"desktop/dist not built. Run `cd desktop && npm install && npm run build`"
        )
    return DESKTOP_DIST


@pytest.fixture(scope="session")
def desktop_dist_url(desktop_dist_dir: Path) -> Iterator[str]:
    """Serve desktop/dist over a throwaway http.server and yield its URL."""
    port = _find_free_port()
    proc = subprocess.Popen(
        ["python3", "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=str(desktop_dist_dir),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # wait until port is open
    for _ in range(40):
        try:
            s = socket.create_connection(("127.0.0.1", port), timeout=0.25)
            s.close()
            break
        except OSError:
            time.sleep(0.1)
    else:
        proc.terminate()
        pytest.fail(f"http.server did not start on port {port}")

    yield f"http://127.0.0.1:{port}"
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture(autouse=True)
def _ignore_tauri_runtime_errors(js_errors):
    """Tauri-only APIs throw in plain browsers; ignore that noise in desktop suite."""
    js_errors.extra_ignore.extend([
        "transformcallback",
        "invoke",
        "__tauri",
        "tauri",
        "is not a function",     # missing __TAURI shim symptom
        "is not iterable",       # destructuring of Tauri responses
        "intermediate value",    # Vite-generated rethrow of the above
    ])


@pytest.fixture(scope="session")
def tauri_binary() -> str | None:
    """Locate the built Tauri binary (debug or release). Returns None if missing."""
    candidates = []
    for mode in ("release", "debug"):
        for name in ("claytablet", "claytablet", "claytab"):
            p = TAURI_TARGET / mode / name
            if p.exists():
                candidates.append(p)
            p_exe = TAURI_TARGET / mode / f"{name}.exe"
            if p_exe.exists():
                candidates.append(p_exe)
    return str(candidates[0]) if candidates else None
