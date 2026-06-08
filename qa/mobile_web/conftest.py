"""Mobile-web fixtures.

Targets the Expo web build of the mobile/ app (`expo start --web`, default
port 8081). Override with MOBILE_WEB_URL env var to point at any deployed
web-bundled mobile app.
"""
from __future__ import annotations

import os
import socket
import pytest


def _is_open(host: str, port: int, timeout: float = 1.0) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        return True
    except OSError:
        return False
    finally:
        s.close()


@pytest.fixture(scope="session")
def mobile_web_url() -> str:
    url = os.environ.get("MOBILE_WEB_URL", "http://localhost:8081")
    # quick reachability check at collection time so skips look clean
    host = url.split("://", 1)[1].split("/", 1)[0]
    if ":" in host:
        h, p = host.rsplit(":", 1)
        port = int(p)
    else:
        h, port = host, (443 if url.startswith("https") else 80)
    if not _is_open(h, port):
        pytest.skip(
            f"Mobile web app not reachable at {url}; "
            f"run `cd mobile && npm run web` (or set MOBILE_WEB_URL)"
        )
    return url.rstrip("/")
