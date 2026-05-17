# r/selfhosted launch post

**Subreddit:** [r/selfhosted](https://reddit.com/r/selfhosted) (~600k subs)
**Flair:** Release
**Best posting time:** Tuesday-Thursday, 9-11 AM ET (16:00-18:00 МСК)

---

## Title (pick one — A/B in your head before posting)

> DubTab — self-hosted real-time clipboard sync between all your devices (text, images, voice, files)

Alternative titles:
- *I built a self-hosted alternative to Pushbullet/AirDrop — runs in one Docker container*
- *Show: DubTab — a "browser tab as a clipboard" for your whole device fleet*
- *Open-source clipboard sync for self-hosters — web, desktop (Tauri), mobile (Expo), CLI, plugin engine*

---

## Body

Hi r/selfhosted 👋

I got tired of copy-pasting things between my laptop, two phones, a Pi, and a work box. Pushbullet got worse, AirDrop is Apple-only, KDE Connect is great but doesn't help with my browser tab on a guest laptop. So I built **DubTab** — a self-hostable clipboard that lives in a browser tab.

You open a room URL on any device → anything you paste (text, image, voice note, file, even a freehand drawing) shows up on every other device in real time via WebSocket. That's the whole pitch.

**Quick start (one command):**

```bash
curl -fsSL https://raw.githubusercontent.com/Goodspoken/dubtab/main/install.sh | bash
```

Auto-generates a JWT secret, detects your LAN IP, prints a QR code for your phone. Or just spin up the `docker-compose.yml` from the repo. No external dependencies — SQLite on the host filesystem, that's it.

**What's in the box:**

- 🌐 **Web app** (React + Tailwind, dark mode, RU/EN)
- 🖥️ **Desktop app** — Tauri 2, Win/Linux/macOS, system tray, global hotkeys (`Ctrl+Shift+V` to paste from current room)
- 📱 **Mobile app** — React Native / Expo (separate repo)
- ⌨️ **CLI** — `dubtab` Go binary with subcommands + a `tui` mode (live board in your terminal via bubbletea)
- 🔌 **Plugin engine** — drop a Python file in `plugins/`, restart, you get `@hook("on_text_added")`, `@scheduled("0 9 * * *")`, `@http.get("/status")` decorators
- 📲 **PWA Share Target** — "Add to Home Screen" on Android/iOS and DubTab appears in the system share menu like Google Drive
- 🔐 Password-protected + read-only rooms, bcrypt, rate-limited brute-force defense
- 🆓 MIT, no telemetry by default, no SaaS upsell

**Tech stack** (in case it matters):
FastAPI + SQLite + Alembic (backend), React 19 + Zustand (frontend), Caddy with auto Let's Encrypt (proxy), all dockerized.

**Public demo** if you just want to poke at it: https://dubtab.app — pick any room name and paste from your phone/laptop. Rooms auto-expire after 24h unless you log in.

**Repo:** https://github.com/Goodspoken/dubtab

It's been my daily driver for about a month. Honest critique very welcome — especially around the plugin model (no isolation, "you self-host, you trust it") and the threat model (it's a clipboard, not a vault, but bcrypt + rate limit + per-room JWT are there).

What I'd love to know from this sub:
- What's the first thing you'd want to plug in via the plugin API?
- Any features you'd port from Syncthing/Nextcloud workflows?
- Is there a category in awesome-selfhosted that fits?

---

## Comments to prepare for

- **"How is this different from KDE Connect / Syncthing / SnapDrop / LocalSend?"**
  → KDE Connect is great peer-to-peer LAN, but no server-side history, no chat, no plugins. Syncthing is file-only and pull-based. SnapDrop/LocalSend is one-shot transfer. DubTab is the "shared tab/board" niche — persistent across reloads, accessible from a borrowed laptop in the browser, has chat, plugins, OAuth.

- **"Why not federation? Why no E2EE?"**
  → Honest answer: scope creep. v1 is a clipboard. E2EE is on the roadmap but breaks server-side dedup, full-text search, plugins reading content. Self-host gives you the strongest guarantee until then.

- **"Plugin API without isolation is scary."**
  → Yes — and that's the intentional trade-off. Target audience is people who write their own automations. If you don't trust a plugin, don't drop it in `plugins/`. Same model as Home Assistant Custom Components, n8n self-hosted nodes, Obsidian community plugins.

- **"Why FastAPI instead of $YOUR_FAVOURITE_FRAMEWORK?"**
  → Mostly inertia (started with FastAPI), but: async-native, OpenAPI for free, plays nicely with WebSocket. No regrets.

- **"License?"** → MIT.

- **"Sponsor / GitHub stars / will it die?"**
  → Solo project but I use it daily, public instance is on my own VPS, repo is open. If I stop, you have the Docker image and the code.

---

## Posting checklist

- [ ] Demo GIF is in the README (max ~5 MB for Reddit preview)
- [ ] `install.sh` actually works on a clean Ubuntu
- [ ] `dubtab.app` is up (health check passes)
- [ ] At least 2-3 stars on GitHub (looks bare otherwise — ask a friend)
- [ ] OAuth on the public demo works (test Google + Yandex)
- [ ] Set aside 4-6 hours after posting to reply to every comment within an hour
- [ ] Don't post X-listed to other subs at the same time — Reddit shadowbans cross-posters
