"""CLI smoke tests — exit codes, help text, config persistence."""
import re
import pytest


pytestmark = pytest.mark.cli


def test_help_runs(run_cli):
    """`claytab --help` returns 0 and lists subcommands."""
    r = run_cli("--help")
    assert r.returncode == 0, r.stderr
    out = r.stdout
    for cmd in ("room", "send", "ls", "watch", "tui", "login", "config"):
        assert cmd in out, f"--help missing subcommand {cmd!r}"


def test_unknown_command_fails(run_cli):
    """Несуществующая команда должна давать ненулевой exit и понятную ошибку."""
    r = run_cli("definitely-not-a-real-command")
    assert r.returncode != 0
    assert re.search(r"unknown command|неизвестн", r.stderr + r.stdout, re.I)


def test_send_without_server_fails_cleanly(run_cli):
    """`claytab send` без настроенного сервера → ошибка с подсказкой, не паника."""
    r = run_cli("send", "hello")
    assert r.returncode != 0
    err = r.stderr + r.stdout
    assert "сервер не задан" in err or "server not set" in err.lower(), err


def test_me_without_login(run_cli):
    """`claytab me` без логина → сообщение 'не авторизован'."""
    r = run_cli("me")
    out = r.stdout + r.stderr
    # exit code can be 0 or 1 — content matters more
    assert re.search(r"не авторизован|not authoriz|войди", out, re.I), out


def test_room_without_config(run_cli):
    """`claytab room` без конфига → подсказка 'комната не задана'."""
    r = run_cli("room")
    out = r.stdout + r.stderr
    assert re.search(r"не задана|not set|claytab room", out, re.I), out
