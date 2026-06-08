"""CLI ↔ Backend end-to-end: send, ls, show, copy, rm, clear, watch."""
import re
import time
import pytest


pytestmark = pytest.mark.cli


def test_send_text_and_list(configured_cli):
    """send → ls показывает отправленный текст."""
    run_cli, room = configured_cli
    msg = f"hello from CLI test {int(time.time())}"
    r = run_cli("send", msg)
    assert r.returncode == 0, r.stderr + r.stdout
    r2 = run_cli("ls")
    assert r2.returncode == 0, r2.stderr
    assert msg in r2.stdout, f"Sent message not visible in ls: {r2.stdout}"


def test_send_via_stdin_pipe(configured_cli):
    """`cat | claytab send` отправляет stdin."""
    run_cli, _ = configured_cli
    payload = "piped content xyz789"
    r = run_cli("send", input_text=payload)
    assert r.returncode == 0, r.stderr
    r2 = run_cli("ls")
    assert payload in r2.stdout, r2.stdout


def test_ls_last_n(configured_cli):
    """`claytab ls --last 2` показывает не больше двух записей."""
    run_cli, _ = configured_cli
    for i in range(4):
        run_cli("send", f"item-{i}")
    r = run_cli("ls", "--last", "2")
    assert r.returncode == 0, r.stderr
    # crude count of message-like lines (any line containing 'item-')
    matches = re.findall(r"item-\d", r.stdout)
    assert len(matches) <= 2, f"--last 2 returned {len(matches)} items: {r.stdout}"


def test_clear_empties_room(configured_cli):
    """`claytab clear --yes` очищает комнату; ls после показывает пусто."""
    run_cli, _ = configured_cli
    run_cli("send", "before clear")
    r = run_cli("clear", "--yes")
    assert r.returncode == 0, r.stderr
    r2 = run_cli("ls")
    assert "before clear" not in r2.stdout, f"clear did not remove items: {r2.stdout}"


def test_send_long_text_handled(configured_cli):
    """Большой (но < 100K char limit) текст принимается."""
    run_cli, _ = configured_cli
    payload = "A" * 5000
    r = run_cli("send", payload)
    assert r.returncode == 0, f"5K text rejected: {r.stderr}"
