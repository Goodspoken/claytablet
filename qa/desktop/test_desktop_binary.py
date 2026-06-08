"""Smoke-tests for the Tauri binary itself.

These are inherently OS-specific and need a real graphical session for
anything beyond `--help`. We split them into three buckets:

  - **build-presence**: does the binary exist? (always runs)
  - **launch-and-exit**: spawn binary in headless mode, kill after N seconds.
    Marked needs_xvfb on Linux without DISPLAY.
  - **webdriver-e2e**: full automation via tauri-driver. Marked needs_xvfb;
    scaffold-only — actual driver setup is out of scope for this devcontainer.
"""
import os
import shutil
import subprocess
import time
import pytest


pytestmark = pytest.mark.desktop


def test_tauri_binary_exists(tauri_binary):
    """Build artifact present in src-tauri/target/{debug,release}/."""
    if tauri_binary is None:
        pytest.skip(
            "Tauri binary not built. Run `cd desktop && npm run tauri build` "
            "(or `cargo build --manifest-path desktop/src-tauri/Cargo.toml`)"
        )
    assert os.path.exists(tauri_binary)


@pytest.mark.needs_xvfb
def test_tauri_binary_launches(tauri_binary):
    """Tauri-бинарник стартует и держится >2 секунд без падения."""
    if tauri_binary is None:
        pytest.skip("no Tauri binary built")
    if not os.environ.get("DISPLAY") and not shutil.which("Xvfb"):
        pytest.skip("no DISPLAY and no Xvfb available — Tauri needs a graphical session")

    proc = subprocess.Popen(
        [tauri_binary],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        time.sleep(2.0)
        assert proc.poll() is None, (
            f"Tauri exited early. stderr: {proc.stderr.read(2000).decode(errors='replace')}"
        )
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest.mark.needs_xvfb
@pytest.mark.skip(reason="tauri-driver scaffold — implement when CI has Xvfb + webkit2gtk-driver")
def test_tauri_webdriver_loads_homepage():
    """Полный E2E через tauri-driver — заготовка для будущего CI runner.

    Установка:
        cargo install tauri-driver
        apt-get install webkit2gtk-driver xvfb

    Тест:
        # запустить tauri-driver на :4444
        # подключиться WebDriverIO/Selenium
        # дождаться рендера и проверить наличие элементов
    """
    pass
