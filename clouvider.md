# 📘 Паспорт VPS-3 (Clouvider UK)

## 🚀 Quick Start (для нового агента / онбординг)

```bash
# Подключиться
ssh -p 2203 illz@213.255.246.146

# sudo без пароля (через /etc/sudoers.d/illz)
sudo whoami   # root

# Out-of-band доступ при потере SSH: VNC/Remote Console в личном кабинете Clouvider
# https://my.clouvider.net → instance → Console
```

| | |
|---|---|
| **Hostname** | `clouvider-uk` |
| **Public IPv4** | `213.255.246.146` |
| **Public IPv6** | `2a0a:8dc0:76::a` (subnet `/48` доступна) |
| **SSH** | `illz@213.255.246.146 -p 2203` (только ключи, password auth выключен) |
| **sudo** | `illz` — `NOPASSWD:ALL` |
| **OS** | Ubuntu 24.04.4 LTS, kernel 6.8.0-111-generic, x86_64 |
| **CPU / RAM / Disk** | 1 vCPU / 1.9 GiB RAM / 48 GB SSD (44 GB свободно) |
| **Доступные UFW-порты** | 2203 (SSH), 2053 (3x-ui панель), 443 (Reality), 8443 (mtproto) |
| **F2B** | active, jail `sshd` |

### Установленный софт (доступен из коробки)
| Tool | Version |
|---|---|
| Docker | 29.1.3 |
| docker compose | v2 (plugin) |
| git | 2.43 |
| curl, wget, jq, sqlite3, make, gcc, python3 (3.12) | ✓ |
| **НЕ установлено** | node/npm, pip3, nginx, caddy — ставить при необходимости |

### Где деплоить новые проекты
- **Compose-проекты:** `/home/illz/<project_name>/` (как `/home/illz/mtproto/` сейчас). docker-compose работает из user-space.
- **Системные сервисы:** `/opt/<name>/` или `/usr/local/<name>/`.
- **Данные:** не загромождать `/`, под крупное брать `/srv/` (создать при необходимости).
- **Память жёстко ограничена 1.9 GiB** — для тяжёлых стеков (Postgres+большие индексы, мониторинги, ML) сервер не подходит, использовать Serverbook (12 GiB RAM).

### Что уже запущено (см. секции ниже)
- 3X-UI панель + Xray Reality (порт 443) — раздел 2-3
- Telegram MTProto telemt — раздел 5.2

---

### 1. Общая информация

- **Провайдер:** Clouvider
- **Public IPv4:** `213.255.246.146`
- **SSH Порт:** `2203` (User: `illz`, sudo доступен)
- **Location:** London, United Kingdom
- **Назначение:** Прокси-зона для Eco-аккаунтов — чистый UK IP, не флагнутый Google (в отличие от Ihor/AS207569)
- **OS:** Ubuntu 24.04.4 LTS (kernel 6.8.0-111-generic)
- **Диск:** 48 GB SSD (≈3.9 GB занято на 2026-05-17)

---

### 2. 3X-UI + Xray (переустановлено с нуля 2026-05-17, нативная установка)

- **Запуск:** Нативный, systemd unit `x-ui.service` (как на Ihor)
- **Форк:** [MHSanaei/3x-ui v2](https://github.com/mhsanaei/3x-ui) (не bigbugcc)
- **Версия 3X-UI:** v2.9.4
- **Версия Xray:** 26.4.25
- **Установка:** `/usr/local/x-ui/`
- **Бинарь:** `/usr/local/x-ui/x-ui`
- **Xray бинарь:** `/usr/local/x-ui/bin/xray-linux-amd64`
- **БД:** `/etc/x-ui/x-ui.db` (sqlite, источник правды)
- **Config Xray:** `/usr/local/x-ui/bin/config.json` (генерируется панелью из БД на каждый Restart, ручные правки теряются)
- **Скрипт установки:** `bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)`

#### Панель управления
| Параметр | Значение |
| --- | --- |
| **URL** | `http://213.255.246.146:2053/HI6FqR8QuaW48HXl2AaPPr/` |
| **Порт** | `2053/tcp` |
| **Логин** | `netspoken` |
| **Пароль** | `fr33int3rn3t3000` |
| **WebBasePath** | `/HI6FqR8QuaW48HXl2AaPPr/` |
| **SSL** | Skipped (HTTP). Включить через GUI → Settings → SSL, опция "Let's Encrypt for IP" |

---

### 3. Xray VLESS+Reality (актуальный конфиг, 2026-05-17)

| Параметр | Значение |
| --- | --- |
| **Inbound ID / remark** | `2` / `test` |
| **Порт** | `443/tcp` |
| **Протокол** | VLESS + Reality |
| **Flow** | `xtls-rprx-vision` |
| **SNI** | `www.amd.com` |
| **Target** | `www.amd.com:443` |
| **Reality PrivateKey** | `eGbMP4QPfItwPviMUqeOhB-v1W7sncwK3Vyb8CiA9Ws` |
| **Reality PublicKey** | `plCjIbnXOkkhkYZzZSLpn0_cp1VuzKPmXitrpFKhYnA` |
| **Short IDs** (8 шт) | `d97e1beda95c34, 2885252d84, 3fc844b7, 79699a, 704a29a5e783dd15, f32a44a4e02e, 1358, 74` |
| **encryption / decryption** | `none` (без Post-Quantum) |
| **testseed (Vision)** | `[900, 500, 900, 256]` |
| **Sniffing** | disabled |

> **Важно:** изначально пробовали `www.microsoft.com` как SNI — НЕ работало с v2rayN/Xray 26.5.x клиентом (handshake висел). `www.amd.com` заработал сразу. Microsoft через Akamai CDN отдаёт нестандартные TLS-параметры, что ломает Reality fallback в новых клиентских версиях.

#### Клиенты
| email | UUID | subId |
| --- | --- | --- |
| `k1ljdbs3` | `8268bdac-d0e8-4df3-a6ec-01f5cda64e3e` | `x3le46ntbu7tn36a` |

#### VLESS-ссылка (Gamebox)
```
vless://8268bdac-d0e8-4df3-a6ec-01f5cda64e3e@213.255.246.146:443?type=tcp&encryption=none&security=reality&pbk=plCjIbnXOkkhkYZzZSLpn0_cp1VuzKPmXitrpFKhYnA&fp=chrome&sni=www.amd.com&sid=d97e1beda95c34&spx=%2F&flow=xtls-rprx-vision#test-k1ljdbs3
```

PublicKey получается из PrivateKey: `sudo /usr/local/x-ui/bin/xray-linux-amd64 x25519 -i <PrivateKey>`

---

### 4. Что НЕ установлено (история)

Все VPN-сервисы снесены 2026-05-17 после 5 дней борьбы с DNS-hijack от AmneziaWG. Полный план сноса: [vps_clouvider_rebuild_plan.md](vps_clouvider_rebuild_plan.md).

Снесено:
- **AmneziaWG** (`awg0`) — пакеты `amneziawg*` purged, конфиг `/etc/amnezia/` удалён, systemd unit отключён
- **3X-UI в Docker** (bigbugcc) — контейнер и образ удалены, `/opt/3x-ui/` удалён
- **mtproto-proxy** (telemt) — контейнер и compose-проект удалены, `/home/illz/mtproto/` удалён
- **WireGuard** — не было установлено

Если нужно вернуть — настраиваем заново вручную, бэкапов не делали.

---

### 5. Firewall (UFW, на 2026-05-17)

| Порт | Назначение |
| --- | --- |
| `2203/tcp` ALLOW | SSH |
| `22/tcp` DENY | дефолтный SSH-порт прибит |
| `2053/tcp` ALLOW | 3X-UI панель |
| `443/tcp` ALLOW | Xray VLESS+Reality |
| `8443/tcp` ALLOW | Telegram MTProto (telemt) |

Default policy: `deny (incoming), allow (outgoing), deny (routed)`.
Fail2Ban активен, jail `sshd`.

### 5.1 SSH hardening (2026-05-17)

- `PasswordAuthentication no` (перезаписан override в `/etc/ssh/sshd_config.d/50-cloud-init.conf`)
- `KbdInteractiveAuthentication no`
- `MaxAuthTries 3` (было 6)
- `X11Forwarding no`
- `PermitRootLogin no` ✓
- `PubkeyAuthentication yes` ✓
- Authorized users: `illz` (ключи в `/home/illz/.ssh/authorized_keys`, 2 ключа)
- root login полностью отключён (authorized_keys пустой)
- sudo для `illz`: `NOPASSWD:ALL` через `/etc/sudoers.d/illz`
- Бэкап `sshd_config`: `/etc/ssh/sshd_config.bak-*` и `/etc/ssh/sshd_config.d/50-cloud-init.conf.bak-*`
- **Out-of-band:** VNC/Remote Console доступен через личный кабинет Clouvider — работает мимо SSH, спасает при потере доступа.

### 5.2 Telegram MTProto (telemt, добавлено 2026-05-17)

- **Образ:** `ghcr.io/telemt/telemt:latest` (v3.4.11 на момент установки)
- **Контейнер:** `mtproto_proxy`
- **Compose:** `/home/illz/mtproto/docker-compose.yml`
- **Config:** `/home/illz/mtproto/config.toml`
- **Маппинг:** `0.0.0.0:8443 → 443` (внутри контейнера)
- **Модели:** `classic`, `secure`, `tls` все включены
- **TLS-маскировка:** `www.google.com`
- **Секрет (raw):** `b7d27cc78a38ac3d363157934a3e1eb8`
- **FakeTLS секрет (`ee` + secret + domain_hex):** `eeb7d27cc78a38ac3d363157934a3e1eb87777772e676f6f676c652e636f6d`
- **Подключение:** [tg://proxy?server=213.255.246.146&port=8443&secret=eeb7d27cc78a38ac3d363157934a3e1eb87777772e676f6f676c652e636f6d](tg://proxy?server=213.255.246.146&port=8443&secret=eeb7d27cc78a38ac3d363157934a3e1eb87777772e676f6f676c652e636f6d)
- **Сборка точ-в-точ как на Ihor** (только секрет уникальный для Clouvider).
- **Известный non-critical warning:** `Failed to flush beobachten snapshot ... Permission denied` — telemt пытается писать stats snapshot в RO-конфиг каталог. На функцию не влияет.

#### Управление
```bash
cd /home/illz/mtproto
sudo docker compose ps
sudo docker compose logs -f --tail 50
sudo docker compose restart
sudo docker compose pull && sudo docker compose up -d   # обновление образа
```

---

### 6. Диагностика

```bash
# Статус сервиса
sudo systemctl status x-ui
sudo systemctl is-active x-ui

# Текущие настройки панели
sudo /usr/local/x-ui/x-ui setting -show true

# Логи
sudo journalctl -u x-ui -n 50 --no-pager

# Актуальный конфиг Xray
sudo cat /usr/local/x-ui/bin/config.json | jq .

# Inbound из БД (источник правды)
sudo sqlite3 /etc/x-ui/x-ui.db \
  "SELECT id, remark, port, protocol, settings, stream_settings FROM inbounds;"

# Прослушка наружу
sudo ss -tlnp | grep -E ':2053|:443'

# Версия
sudo /usr/local/x-ui/x-ui -v
sudo /usr/local/x-ui/bin/xray-linux-amd64 version
```

---

### 7. Технические особенности

- **Источник правды** — БД `/etc/x-ui/x-ui.db`. `/usr/local/x-ui/bin/config.json` пересобирается панелью на каждый Restart, ручные правки файла теряются.
- **HEAD-запросы возвращают 404, GET — 200** — quirk Gin-роутера 3X-UI, не баг. Тестировать только `curl -s` (GET).
- Reality SNI указывается **без порта** (`www.amd.com`), `target` — с портом (`www.amd.com:443`).
- **SNI выбор для Reality**: `www.microsoft.com` и `www.amazon.com` оба нестабильны (через Akamai/CloudFront CDN отдают нестандартные TLS-параметры — handshake клиента Xray 26.5.x фейлится). Рабочие SNI: `www.amd.com` (проверено), также подходят чистые корпоративные сайты с собственным TLS-stack.
- **ShortIDs разной длины** (1–8 байт hex) — 3X-UI v2.9.4 при `Get New Short IDs` генерит сразу 8 штук. Клиент VLESS-ссылки использует первый из массива. Работает нормально, длина не критична.
- **Access log Xray** включён: `/usr/local/x-ui/bin/access.log`, loglevel `info`. Включён через GUI Panel → Xray Configs → Log.
- **Производительность:** speedtest 2026-05-17 через прокси с Gamebox → 354/326 Mbps, ping 41ms (server London).
- Управление панелью через CLI: `sudo x-ui` (интерактивное меню) или прямые subcommands (`x-ui setting -username ...`, `-password ...`, `-port ...`, `-webBasePath ...`, `-reset`).
