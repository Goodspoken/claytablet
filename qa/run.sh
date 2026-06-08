#!/usr/bin/env bash
# Install deps and run the full QA suite (all bots).
# Forwarded args go straight to pytest, so you can filter:
#   ./run.sh -m cli              # only CLI bot
#   ./run.sh -m "web or cli"     # web + CLI
#   ./run.sh cli/test_cli_basic.py::test_help_runs -v
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
playwright install chromium >/dev/null 2>&1 || true

pytest --html=report.html --self-contained-html "$@"
