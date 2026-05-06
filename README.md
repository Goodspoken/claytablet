# ClayTablet

**Instant clipboard sync between your devices — text, images, audio, files.**  
Copy on your PC, open on your phone. No account required to start.

[claytablet.online](https://claytablet.online) · MIT License · Self-hosted friendly

---

## Features

- **Real-time sync** — WebSocket, zero delay
- **Universal board** — text, images, voice notes, files, canvas drawings
- **Rooms** — isolated boards by short URL, share with anyone via link or QR
- **Passwords** — bcrypt-protected rooms
- **Read-only mode** — owner writes, guests view (new in v2.4)
- **CLI** — `claytab send "hello"` / `cat log | claytab send` / `claytab copy`
- **Auth** — Google & Yandex OAuth, personal rooms tied to your account
- **Dark mode + i18n** — RU / EN
- **Self-hostable** — one `docker compose up` or `curl | bash`

## Quick Start (Self-Hosted)

```bash
curl -fsSL https://raw.githubusercontent.com/Goodspoken/claytablet/main/install.sh | bash
```

Opens at `http://localhost:8080`.  
Edit `~/.claytablet/.env` to add a domain, OAuth keys, etc.

## Manual Setup

```bash
git clone https://github.com/Goodspoken/claytablet
cd claytablet
cp .env.example .env      # fill in JWT_SECRET, HOST_URL, ALLOWED_ORIGINS
docker compose up -d --build
```

## CLI (`claytab`)

```bash
# Install (Linux/macOS)
curl -fsSL https://claytablet.online/claytab-linux-amd64 -o claytab && chmod +x claytab

# Quick usage
claytab config --server https://claytablet.online --room my-room
claytab login                    # Google or Yandex OAuth
claytab send "hello from terminal"
cat error.log | claytab send
claytab ls                       # list board
claytab copy                     # last text → OS clipboard
claytab watch                    # stream updates in real time
```

## Development

```bash
# Backend (Python 3.11 / FastAPI)
cd backend && pip install -r requirements.txt
uvicorn main:app --reload        # :8000

# Frontend (React 19 / Vite)
cd frontend && npm install
npm run dev                      # :5173, /api proxied to :8000

# Tests
cd backend && pytest tests/ -v   # 27 API tests
```

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11, FastAPI, SQLite, Alembic, WebSocket |
| Frontend | React 19, Vite, Tailwind CSS v4, Zustand |
| Proxy | Caddy (auto-HTTPS via Let's Encrypt) |
| Runtime | Docker + Docker Compose |
| CLI | Go 1.22, Cobra, gorilla/websocket |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `HOST_URL` | ✅ | Public URL (e.g. `https://claytablet.online`) |
| `ALLOWED_ORIGINS` | ✅ | CORS origins, comma-separated |
| `GOOGLE_CLIENT_ID/SECRET` | — | Google OAuth |
| `YANDEX_CLIENT_ID/SECRET` | — | Yandex OAuth |
| `SENTRY_DSN` | — | Error tracking |
| `DATA_DIR` | — | Storage path (default `/app/data`) |

## Contributing

1. Fork → branch → PR
2. Run `pytest tests/ -v` (backend) and `npm run build` (frontend) before submitting
3. Follow existing code style — no comments unless the WHY is non-obvious

## License

MIT — see [LICENSE](LICENSE)
