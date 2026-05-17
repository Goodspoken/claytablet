# Hacker News — Show HN draft

**When to post:** Tuesday-Thursday, 9-11 AM Eastern Time (16:00-18:00 МСК).
**Where:** [news.ycombinator.com/submit](https://news.ycombinator.com/submit)
**Account age:** older = better; if your account is brand new, post in /show first.

---

## Title (HN strict rules)

> Show HN: ClayTablet – self-hosted real-time clipboard between all your devices

Rules HN enforces:
- Start with `Show HN:` (mandatory for projects)
- No emoji, no marketing adjectives ("amazing", "blazingly fast")
- Keep under 80 chars

---

## URL field

`https://github.com/Goodspoken/claytablet`

(Not `claytablet.online` — HN prefers code repos for Show HN; you can link the live demo in the body)

---

## Text field

> Hi HN — ClayTablet is a small open-source project I've been running as my daily driver for a month. It's a "browser tab as a shared clipboard" — open a room URL on every device you own, anything you paste (text, image, voice note, file, drawing) appears on the other devices in real time via WebSocket.
>
> Live demo: https://claytablet.online — pick any room name.
>
> Self-host with `docker compose up`. Comes with a Tauri desktop app, an Expo mobile app, a Go CLI (`claytablet`) with an interactive TUI, and a plugin engine where you drop a Python file with `@hook("on_text_added")` / `@scheduled(cron)` / `@http.get` decorators.
>
> Stack: FastAPI + SQLite + WebSocket, React 19, Caddy for auto-HTTPS. Background and the things I'd push back on if I were reviewing this:
>
> - **No E2EE.** Server reads content. Mitigated by self-host + per-room passwords + JWT. On the roadmap but breaks plugins-that-read-content.
> - **Plugin engine has no sandbox** — drops directly into the FastAPI process. Same trust model as Home Assistant custom components or n8n self-hosted nodes.
> - **It's a clipboard, not a vault.** Bcrypt on room passwords, rate limit on brute-force, but data at rest is plaintext SQLite. Treat it like Pastebin you control.
>
> What I'd love feedback on: the plugin API surface (small but I'm not sure it's the right shape), and whether the public claytablet.online demo feels useful enough to bookmark.
>
> Repo: https://github.com/Goodspoken/claytablet

---

## What to do in the first 60 minutes after posting

1. Don't refresh the page constantly — open the comments tab once every 15 min.
2. **Reply to every comment within 30 minutes.** This is the single biggest factor for HN ranking after upvotes. Thoughtful replies > defensive replies.
3. If a critique is valid, say "fair point" and explain the trade-off. If a critique is wrong, say *why* without being defensive.
4. Don't ask friends to upvote. HN detects vote rings and shadowbans the post.
5. Don't repost if it flops. You get one shot per project; subsequent posts are downweighted.

---

## What "good" looks like

- **Front page** in the first 2 hours → likely a few hundred stars, several thousand uniques, 50+ comments. Plan for the demo server load.
- **Second page** but stays warm → still 50-100 stars, slower trickle.
- **Dies in /new** → fine, just bad luck. Try a different angle in 6 months.

---

## Pre-launch checks

- [ ] `claytablet.online` health check is green
- [ ] Demo room can handle ~50 concurrent WS connections (rate limit currently 50/room — bump to 200 before launch)
- [ ] Server CPU/memory headroom (watch for plugin-loaded memory)
- [ ] OAuth callbacks work on production (Google + Yandex)
- [ ] Sentry is wired up so you see errors in real time
- [ ] README has demo GIF and `install.sh` works on a clean cloud VM
