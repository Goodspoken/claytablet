# ClayTablet QA Bots

Per-target E2E bots. All share the same pytest harness and HTML reporter.

```
qa/
├── conftest.py            # shared fixtures (target_url, api_url, http_get,
│                          # JSErrorCollector, page, mobile_page)
├── pytest.ini             # markers: web cli tui mobile_web desktop ...
├── requirements.txt
├── run.sh
│
├── web/                   # ✅ React SPA — Playwright
│   ├── test_home.py
│   ├── test_mobile.py
│   ├── test_api.py
│   ├── test_auth.py
│   └── test_seo.py
│
├── cli/                   # ✅ `claytab` Go binary — subprocess
│   ├── conftest.py        #   (isolated XDG_CONFIG_HOME per test)
│   ├── test_cli_basic.py
│   ├── test_cli_config.py
│   └── test_cli_e2e.py    #   needs backend running
│
├── tui/                   # ✅ `claytab tui` — pexpect PTY driver
│   ├── conftest.py
│   └── test_tui_basic.py
│
├── mobile_web/            # ⚠ Expo web target — Playwright
│   ├── conftest.py        #   (auto-skips if expo not running on :8081)
│   └── test_mobile_web_smoke.py
│
└── desktop/               # ⚠ Tauri — frontend served as static, binary smoke
    ├── conftest.py
    ├── test_desktop_frontend.py    # works headless
    └── test_desktop_binary.py      # needs Xvfb on Linux
```

## Запустить ВСЁ

```bash
cd qa
./run.sh                                 # установит deps, запустит, сделает report.html
```

## Запустить только один таргет

```bash
pytest -m web                            # только web SPA
pytest -m cli                            # только CLI
pytest -m tui                            # только TUI
pytest -m mobile_web                     # только Expo web
pytest -m desktop                        # только Tauri
pytest -m "web or cli"                   # комбо
```

Или по пути:

```bash
pytest web/                              # эквивалент
pytest cli/test_cli_basic.py -v          # один файл
pytest cli/test_cli_e2e.py::test_send_text_and_list -v   # один тест
```

## Что нужно поднять перед запуском

| Набор | Зависимости |
|---|---|
| `web` | backend на `:8000` + frontend dev на `:5173` |
| `cli` (basic/config) | ничего — работают без сети |
| `cli` (e2e) | backend на `:8000` |
| `tui` | backend на `:8000` |
| `mobile_web` | `cd mobile && npm run web` → `:8081` (иначе тесты skip) |
| `desktop` (frontend) | `cd desktop && npm install && npm run build` (иначе skip) |
| `desktop` (binary) | `cd desktop && npm run tauri build` + `DISPLAY` или Xvfb |

## Переменные окружения

| Var | Дефолт | Назначение |
|---|---|---|
| `TARGET_URL` | `http://localhost:5173` | Frontend (web set) |
| `API_URL` | то же, что `TARGET_URL` | Backend (web/cli/tui) |
| `MOBILE_WEB_URL` | `http://localhost:8081` | Expo web |
| `CLAYTAB_BIN` | `<repo>/cli/claytab` | путь к собранному CLI |

## Что **не** проверяется этим стеком

- **Нативный Android** (mobile/ через React Native bundle) — нужен Android SDK + эмулятор + Appium. Скелет можно добавить отдельным `qa/android/` если будет CI runner.
- **Tauri WebDriver E2E** — нужен `tauri-driver` + `webkit2gtk-driver` + Xvfb. Маркер `needs_xvfb` уже зарезервирован.
