# Project Overview

**PopyCast** (formerly Clipboard) is a real-time full-stack web application for sharing text, images, audio, and chat messages in ephemeral "rooms".

- **Backend:** Python + FastAPI. REST API + WebSocket for real-time sync. Data stored in-memory (texts, chats) and on filesystem (images, audio in `/app/data`).
- **Frontend:** SPA built with React 19, TypeScript, Vite, Tailwind CSS v4.
- **Infrastructure:** Docker Compose for both frontend and backend services.

## Building and Running

### Using Docker Compose (Recommended)
```bash
docker-compose up --build
```
- **Frontend (HTTPS):** `https://popycast.duckdns.org` (или `https://localhost:443` при локальной разработке)
- **Backend API:** `http://localhost:8555`

> Note: HTTPS обеспечивается Caddy с автоматическим сертификатом от Let's Encrypt. При первом запуске Caddy потребуется доступ к интернету для получения сертификата.

### Local Development (Frontend)
```bash
cd frontend
npm install
npm run dev
```
Vite proxy forwards `/api` requests to `http://127.0.0.1:8000`.

### Local Development (Backend)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## API Endpoints

All endpoints are prefixed with `/api/popycast/{room_id}`:

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/popycast/{room_id}` | Get room data |
| POST | `/api/popycast/{room_id}/text` | Add text |
| POST | `/api/popycast/{room_id}/image` | Upload image |
| POST | `/api/popycast/{room_id}/audio` | Upload audio |
| POST | `/api/popycast/{room_id}/chat` | Send chat message |
| GET/POST | `/api/popycast/{room_id}/settings` | Get/update settings (TTL, password) |
| POST | `/api/popycast/{room_id}/verify-password` | Verify room password |
| POST | `/api/popycast/{room_id}/order` | Update card order |
| DELETE | `/api/popycast/{room_id}/all` | Clear all |
| DELETE | `/api/popycast/{room_id}/{item_id}` | Delete single item |
| GET | `/api/files/{filename}` | Serve media file |
| WS | `/api/ws/rooms/{room_id}` | WebSocket channel |

## Development Conventions

- **Frontend:**
  - React 19 with functional components and hooks
  - TypeScript strictly used everywhere
  - Tailwind CSS v4
  - Components in `src/components/`, hooks in `src/hooks/`, API in `src/api.ts`
  - ESLint for code quality

- **Backend:**
  - FastAPI with Pydantic models
  - Async/await throughout
  - MIME type validation strips codec parameters (e.g. `audio/webm;codecs=opus` → `audio/webm`)
  - File uploads streamed in 64KB chunks (max 20MB)
  - Room passwords hashed with bcrypt
  - Inactive rooms auto-cleaned based on configurable TTL

## Deploy

```bash
# Rebuild only backend (from project root on server)
docker compose up -d --build backend

# Rebuild everything
docker compose up -d --build

# Deploy to VPS from Gamebox (Windows PowerShell)
.\deploy.ps1
```

Deployment target: VPS `109.120.134.188`, user `admin`, port `2202`, project dir `/opt/clipboard`.
