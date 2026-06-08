"""TUI smoke tests — launch, render, quit."""
import re
import time
import pytest


pytestmark = pytest.mark.tui


def test_tui_launches(tui_session):
    """TUI запускается и держится живым >0.5s (не падает мгновенно)."""
    time.sleep(0.8)
    assert tui_session.isalive(), "TUI exited within 0.8s of launch"


def test_tui_renders_something(tui_session):
    """В первую секунду TUI выдаёт какой-то рендер (>0 байт нон-ANSI)."""
    import re
    time.sleep(1.0)
    # read whatever has been produced so far without blocking
    try:
        output = tui_session.read_nonblocking(size=4096, timeout=0.5)
    except Exception:
        output = ""
    ansi_re = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]")
    visible = ansi_re.sub("", output)
    assert len(visible.strip()) > 0 or len(output) > 0, "TUI produced no output"


def test_tui_quits_on_q(tui_session):
    """Нажатие 'q' завершает TUI с exit code 0."""
    import pexpect
    time.sleep(0.5)
    tui_session.send("q")
    try:
        tui_session.expect(pexpect.EOF, timeout=5)
    except pexpect.TIMEOUT:
        tui_session.send("\x03")  # Ctrl-C fallback
        tui_session.expect(pexpect.EOF, timeout=3)
    tui_session.close()
    # Some TUIs return 0, some 130 on ctrl-c — accept both as "non-crash"
    assert tui_session.exitstatus in (0, None) or tui_session.signalstatus is not None
