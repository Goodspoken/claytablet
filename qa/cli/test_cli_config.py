"""CLI config command — persistence of server/room/password into the TOML."""
import pytest


pytestmark = pytest.mark.cli


def test_config_writes_server(run_cli, cli_config_home):
    """`claytab config --server X --room Y` создаёт TOML с указанными значениями."""
    r = run_cli("config", "--server", "https://example.test", "--room", "abc123")
    assert r.returncode == 0, r.stderr

    # CLI uses os.UserHomeDir() and writes ~/.config/claytablet.toml.
    # Fixture sets HOME=cli_config_home.parent, so we look there.
    cfg_path = cli_config_home.parent / ".config" / "claytablet.toml"
    assert cfg_path.exists(), (
        f"Config file not at {cfg_path}; CLI output: {r.stdout!r}"
    )
    content = cfg_path.read_text()
    assert "example.test" in content
    assert "abc123" in content


def test_config_persists_across_invocations(run_cli):
    """После `config --room X`, последующий `room` показывает X."""
    run_cli("config", "--server", "https://example.test", "--room", "persist-room")
    r = run_cli("room")
    out = r.stdout + r.stderr
    assert "persist-room" in out, out


def test_config_room_change(run_cli):
    """`claytab room <new>` переключает текущую комнату."""
    # First set initial config
    run_cli("config", "--server", "https://example.test", "--room", "room-one")
    # Switch
    r = run_cli("room", "room-two")
    assert r.returncode == 0, r.stderr
    # Verify
    r2 = run_cli("room")
    assert "room-two" in (r2.stdout + r2.stderr)
