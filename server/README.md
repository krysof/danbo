# EGGY Multiplayer Server

Colyseus 0.18 room server for the first online milestone: eight players in one room, city transfer, movement/action replication, chat, and 20-second reconnection seats.

## Windows tray application

The standalone desktop host bundles the game server and a loopback-only web control panel:

```bash
cd server
npm install
npm run desktop
```

After launch, EGGY Server stays in the Windows notification area. Click the tray icon, or directly open `http://127.0.0.1:2568`, to enter the loopback-only management page. The page can start and stop the room server, install and supervise this project's own `cloudflared` process, configure the public hostname, inspect room/player health, and view logs.

Build the Windows installer and portable executable with Node.js 22.12 or later:

```bash
npm run package:win
```

Artifacts are written to `server/release/`.

### Security model

- The management server binds only to `127.0.0.1` and requires an ephemeral tray-issued session plus CSRF token.
- Tunnel Token and API Token are kept separately using Electron `safeStorage` (Windows DPAPI). They are never written to the public game bundle or normal logs.
- `cloudflared` receives its Tunnel Token through its child environment, not its command line.
- The process supervisor only stops child processes created by the current EGGY Server instance; stale PID files are never used to kill a process.
- Cloudflare configuration always performs GET before PUT, preserves other ingress rules and unknown fields, keeps the catch-all last, detects hostname/DNS conflicts, and rolls ingress back when DNS configuration fails.

## Local development

```bash
cd server
npm install
npm test
npm run dev
```

The server listens on `http://localhost:2567`. Open the game with `?net=ws://localhost:2567`.

## Production

Build and run either directly or with Docker:

```bash
docker build -t eggy-multiplayer ./server
docker run --rm -p 2567:2567 \
  -e PORT=2567 \
  -e ALLOWED_ORIGINS=https://eggy.ff18.com \
  eggy-multiplayer
```

The public endpoint must support WebSockets and HTTPS/WSS. The production client defaults to `wss://online.ff18.com`, intended to be a Cloudflare Tunnel pointing at this machine's `http://localhost:2567`. You can override it via `window.DANBO_MULTIPLAYER_URL`, the build environment variable `DANBO_MULTIPLAYER_URL`, the `?net=wss://host` query, or the in-game advanced server field.
