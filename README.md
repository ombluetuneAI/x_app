# X Profile Viewer

Web UI for browsing X (Twitter) profiles, timelines, media, and follow graphs. The frontend lives in `static/`; the backend can run as **Flask** locally (`api_server.py`) or on **Cloudflare Pages** via Pages Functions (`functions/`).

## Features

- User search and profile display
- Home timeline (For You / Following)
- Tweet browsing with media
- Following / followers lists
- Follow / unfollow actions
- Optional NiuTrans translation (server-proxied on Pages)

## Local development (Flask)

1. Install Python dependencies (see your environment; `flask`, `flask-cors`, `requests`).

2. Create `config.json` in the repo root:

```json
{
  "auth_token": "your_auth_token",
  "ct0": "your_csrf_token",
  "proxy": "http://127.0.0.1:7890"
}
```

3. Run the API + static server:

```bash
python api_server.py
```

Open http://localhost:5000

## Cloudflare Pages deployment

Static assets are served from `static/`. API routes are implemented as [Pages Functions](https://developers.cloudflare.com/pages/functions/) under `functions/api/`, matching the paths expected by `static/app.js` (`API_BASE` defaults to same-origin).

### Prerequisites

- Cloudflare account
- X session cookies: `auth_token` and `ct0` from a logged-in browser session on x.com

### Pages environment variables (secrets)

Set these in the Cloudflare dashboard for project **x-xiaoxu** ([x-xiaoxu.pages.dev](https://x-xiaoxu.pages.dev) → Settings → Environment variables), for both Production and Preview:

| Variable | Required | Description |
|----------|----------|-------------|
| `X_AUTH_TOKEN` | Yes | Cookie `auth_token` |
| `X_CT0` | Yes | Cookie `ct0` (also sent as `X-Csrf-Token`) |
| `ACCESS_KEY` | Yes | Shared secret for site access (see below) |
| `NIUTRANS_APP_ID` | No | NiuTrans app id (translation) |
| `NIUTRANS_API_KEY` | No | NiuTrans API key (translation) |
| `X_BEARER` | No | Override Twitter web bearer token (default is built-in public token) |

Never commit real credential values.

### Access protection

When `ACCESS_KEY` is set, `functions/_middleware.js` requires a matching value via:

- HttpOnly cookie `access_key` (set by `POST /api/auth/login`), or
- Header `X-Access-Key`

Unauthenticated browser requests redirect to `/login` (Pages pretty URLs serve `login.html` at `/login`). API requests return `401` JSON.

For stronger protection (SSO, MFA, IP policies), consider [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) in front of the Pages hostname.

### GitHub Actions

Repository secrets:

- `CLOUDFLARE_API_TOKEN` — token with Cloudflare Pages edit permission
- `CLOUDFLARE_ACCOUNT_ID` — your account id

On push to the default branch (or manual `workflow_dispatch`), `.github/workflows/deploy-cloudflare-pages.yml` runs `wrangler pages deploy static --project-name=x-xiaoxu`.

### Local Pages dev

```bash
npm install
cp .dev.vars.example .dev.vars   # edit with dummy or real values
npm run pages:dev
```

Open http://localhost:8788

Verify:

- Static files and SPA load
- With `ACCESS_KEY` set, `/` redirects to login; `/api/auth/login` sets cookie
- `/api/home/timeline` returns `{ success: false, error: ... }` with HTTP 503 if `X_AUTH_TOKEN` / `X_CT0` are missing

### Parser tests

```bash
npm test
```

### Operational caveat

X may block or rate-limit requests from Cloudflare datacenter IP addresses. If timelines fail only on Pages but work locally, use a residential proxy or run the Flask backend outside Cloudflare.

## Project layout

| Path | Role |
|------|------|
| `static/` | SPA (`index.html`, `app.js`, …) |
| `functions/` | Pages Functions API + middleware |
| `x_client/` | Python X API client (Flask / scripts) |
| `api_server.py` | Local Flask server |
| `wrangler.toml` | Pages build output dir (`static`) |

## API routes (Flask and Pages)

- `GET /api/home/timeline?type=foryou|following&count=&cursor=`
- `GET /api/user/:screen_name`
- `GET /api/user/:screen_name/media|following|followers|tweets`
- `POST /api/user/:user_id/follow|unfollow`
- `POST /api/translate` (Pages; proxies NiuTrans)
- `POST /api/auth/login` (Pages; access gate)
