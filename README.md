<div align="center">

# 🪧 DubTab

**A real-time clipboard, drop-box and notepad shared across all your devices.**

Copy text on your laptop → it's already on your phone. Drop a file in the browser → grab it from the terminal. No accounts, no cloud sign-up, no vendor lock-in.

[**🌐 dubtab.app**](https://dubtab.app) · [Docs](https://github.com/Goodspoken/dubtab/wiki) · [Releases](https://github.com/Goodspoken/dubtab/releases)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-compose-blue?logo=docker)](https://github.com/Goodspoken/dubtab)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue?logo=python)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/react-19-61dafb?logo=react)](https://react.dev/)
[![Tauri 2](https://img.shields.io/badge/tauri-2-orange?logo=tauri)](https://tauri.app/)

<!-- TODO: replace with real demo GIF (15-30s, copy text on PC → instantly appears on phone) -->
<img src="docs/demo.gif" alt="DubTab demo" width="720" />

</div>

---

## ✨ Why DubTab?

You know the moment — you copy a long token on your laptop, then have to type it character-by-character on your phone. Or you snap a screenshot on the phone and need it on the PC *right now*. DubTab is one URL that fixes that for every device you own.

- 🚀 **Real-time** — WebSocket, sub-100ms sync
- 🔐 **Self-hostable** — one `docker compose up` and you own your data
- 📱 **Everywhere** — Web, Desktop (Tauri), Mobile (Expo), CLI, share-target on Android/iOS
- 🔌 **Pluggable** — drop a Python file into `plugins/` to add hooks, cron jobs, custom endpoints
- 🆓 **Free forever** — MIT, no SaaS upsell, no telemetry by default

---

## 🎬 In 30 seconds

```bash
# Self-host
curl -fsSL https://raw.githubusercontent.com/Goodspoken/dubtab/main/install.sh | bash
# Opens at http://<your-lan-ip>:8080 — scan the QR with your phone, done.
```

Or just use the public instance: **[dubtab.app](https://dubtab.app)** → type any room name → paste from any device.

---

## 📸 Screenshots

<table>
  <tr>
    <td><img src="docs/screenshots/desktop.png" alt="Web app" width="350" /></td>
    <td><img src="docs/screenshots/mobile.png" alt="Mobile" width="180" /></td>
  </tr>
  <tr>
    <td align="center">Web app with text, images, voice notes, chat</td>
    <td align="center">Mobile board (responsive)</td>
  </tr>
</table>

---

## 🛠 Features

### Content types
- **Text** — paste with `Ctrl+V`, type, multi-line, automatic URL detection + YouTube embeds
- **Images** — `Ctrl+V`, drag & drop, batch upload, click to preview/copy back
- **Voice notes** — record in-browser (cross-browser MediaRecorder)
- **Files** — any type, up to 50 MB, streaming upload
- **Drawings** — built-in canvas with touch support
- **Chat** — per-room with nicknames

### Sharing & access
- **Rooms by URL** — `dubtab.app/my-room`, public boards in the lobby
- **Password protection** — bcrypt, rate-limited brute-force defence
- **Read-only mode** — owner writes, guests view
- **Personal rooms** — tied to OAuth account (Google / Yandex), never auto-expire
- **QR codes** — share a room with one phone scan
- **Custom TTL** — 10 min / 1 hour / 24 h / 7 days / forever

### Apps
- **Web** — React 19 + Tailwind v4, dark mode, RU/EN
- **Desktop** ([releases](https://github.com/Goodspoken/dubtab/releases)) — Tauri 2 (Windows/Linux/macOS), global hotkeys `Ctrl+Shift+V` / `Ctrl+Shift+C`, system tray, auto-updater
- **Mobile** — React Native + Expo (Android/iOS) — [separate repo](https://github.com/Goodspoken/dubtab-mobile)
- **CLI** — `dubtab` Go binary: `ls`, `send`, `copy`, `watch`, `tui` (interactive terminal board)
- **PWA Share Target** — `Add to Home Screen` on phone → DubTab appears in the system Share menu like Google Drive

### Hosting & ops
- **Docker Compose** — one-line deploy with auto-HTTPS via Caddy + Let's Encrypt
- **LAN mode** — works without internet, prints QR with LAN URL on boot
- **Plugin engine** — drop `plugins/my-plugin/plugin.py` with `@hook`, `@scheduled`, `@http.get` decorators
- **Custom server** — point any web/desktop/mobile client at your self-hosted instance

---

## 🚀 Quick Start

### Option 1 — Public instance (zero setup)
Open [dubtab.app](https://dubtab.app), pick a room name, paste from any device.

### Option 2 — Self-host with one command
```bash
curl -fsSL https://raw.githubusercontent.com/Goodspoken/dubtab/main/install.sh | bash
```
Generates a JWT secret, detects your LAN IP, prints a QR code. Edit `~/.dubtab/.env` to customise.

### Option 3 — Docker Compose
```bash
git clone https://github.com/Goodspoken/dubtab
cd dubtab
cp .env.example .env       # set JWT_SECRET, HOST_URL, ALLOWED_ORIGINS
docker compose up -d --build
```

### Option 4 — Use the public instance from CLI
```bash
curl -fsSL https://dubtab.app/dubtab-linux-amd64 -o dubtab && chmod +x dubtab
./dubtab login                    # OAuth in browser
./dubtab send "hello from terminal"
cat error.log | ./dubtab send     # pipe a logfile
./dubtab tui                      # interactive terminal board
```

---

## 🔌 Plugins

Drop a folder into `plugins/`, restart the server, done. No isolation — for self-hosted users who trust their own code.

```python
# plugins/my-plugin/plugin.py
from dubtab_sdk import hook, scheduled, http, api

@hook("on_text_added")
async def on_text(room_id: str, content: str, item_id: str):
    if "TODO" in content:
        await api.add_chat(room_id, "bot", "Don't forget!")

@scheduled("0 9 * * *")             # every day at 9 AM
async def morning_briefing():
    await api.add_text("daily", "☀️ Good morning")

@http.get("/status")
async def status(request):
    return {"ok": True}              # exposed at /api/plugins/my-plugin/status
```

Full guide: [plugins/PLUGIN_API.md](plugins/PLUGIN_API.md)

---

## 🏗 Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11 · FastAPI · SQLAlchemy + Alembic · SQLite · WebSocket · APScheduler |
| Frontend | React 19 · Vite · Tailwind v4 · Zustand · TypeScript |
| Desktop | Tauri 2 (Rust) · Windows / Linux / macOS |
| Mobile | React Native · Expo SDK 54 |
| CLI | Go 1.22 · Cobra · bubbletea + lipgloss (TUI) |
| Proxy | Caddy (automatic Let's Encrypt) |
| Runtime | Docker · Docker Compose |
| CI | GitHub Actions (backend ruff + pytest, frontend eslint + build, desktop matrix build) |

---

## 🧑‍💻 Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload          # :8000
pytest tests/ -v                   # 27 API tests

# Frontend
cd frontend
npm install
npm run dev                        # :5173 (proxies /api → :8000)
npm run build && npm run lint

# CLI
cd cli && go build ./...           # builds dubtab

# Desktop
cd desktop && npm install && npm run tauri dev
```

---

## ⚙️ Environment

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | ✅ | Use a long random string in prod |
| `HOST_URL` | ✅ | Public URL (e.g. `https://dubtab.app`) |
| `ALLOWED_ORIGINS` | ✅ | CORS origins, comma-separated |
| `GOOGLE_CLIENT_ID` / `SECRET` | — | Google OAuth |
| `YANDEX_CLIENT_ID` / `SECRET` | — | Yandex OAuth |
| `SENTRY_DSN` | — | Backend error tracking |
| `VITE_SENTRY_DSN` | — | Frontend error tracking (Vite inlines at build time) |
| `PLUGIN_ADMINS` | — | Comma-separated user IDs allowed to edit plugin config |
| `DATA_DIR` | — | Storage path (default `/app/data`) |

Full sample: [.env.example](.env.example)

---

## 🤝 Contributing

PRs welcome — especially:
- Translations beyond RU/EN
- Plugins (drop them in `plugins/` and open a PR)
- Bug reports with reproducible steps

Before submitting:
```bash
cd backend && pytest tests/ -v && ruff check .
cd frontend && npm run lint && npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## 📜 License

MIT — do whatever you want, just don't blame me if you break it. See [LICENSE](LICENSE).

If DubTab saved you time, [give the repo a ⭐](https://github.com/Goodspoken/dubtab) — it really helps with discovery.
