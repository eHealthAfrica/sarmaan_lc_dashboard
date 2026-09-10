# SARMAAN LGA Coordinator Dashboard

Live dashboard for the Kano AMR project — auto-refreshes hourly from KoboToolbox. React/Vite frontend, deployed to GitHub Pages.

## How it works

1. **`fetch-data.yml`** (GitHub Action, hourly) pulls all submissions from KoboToolbox using the `KOBO_TOKEN` secret and commits the result to `data/data.json` (and each other state's file under `data/`).
2. **`deploy.yml`** (GitHub Action, on push to `main` / hourly at :10 / manual) installs deps, copies the latest files from `data/` into `public/data/`, runs `npm run build`, and deploys `dist/` to GitHub Pages.
   - It's on its own hourly schedule (not just `push`) because commits made with the default `GITHUB_TOKEN` — which is what `fetch-data.yml` pushes with — don't trigger other workflows' `push` events. Without the schedule, the fetch would keep updating `data/` in the repo but the deployed site would never pick it up.
3. The deployed app fetches its own `data/data.json` at runtime (`src/hooks/useData.js`) and re-polls every 10 minutes client-side, so an open browser tab picks up a new deploy without a manual reload.

## Local development

```bash
npm install
npm run dev
```

Vite serves at `http://localhost:5173/sarmaan-lc-dashboard/` (the `base` in `vite.config.js` matches the GitHub Pages path). `public/data/` is a local-only snapshot for dev — Vite needs *something* there to serve, but it's gitignored so it never gets committed (avoids tracking the same data twice, since `data/` at the repo root is the real source). If you want current numbers locally:

```bash
mkdir -p public/data && cp data/*.json public/data/           # macOS/Linux
if not exist public\data mkdir public\data & xcopy data\*.json public\data\ /Y  # Windows
```

## Setup on a fresh repo (already done for this one)

1. Repo → **Settings → Secrets and variables → Actions** → add `KOBO_TOKEN` (your KoboToolbox API token).
2. Repo → **Settings → Pages → Source** → **GitHub Actions** (not "Deploy from a branch" — the React build needs `deploy.yml` to run).
3. Push to `main`. `deploy.yml` builds and publishes automatically; `fetch-data.yml` keeps `data/` current.

## Changing the refresh frequency

- Data fetch: edit the `cron` in `.github/workflows/fetch-data.yml` (currently `0 * * * *`, hourly).
- Site rebuild: edit the `cron` in `.github/workflows/deploy.yml` (currently `10 * * * *`, ten minutes after the fetch, to give it time to land).

## Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard shows stale data | Check the **Actions** tab — both `Fetch KoboToolbox Data` and `Build and Deploy React App` should show recent green runs. Run either manually via `workflow_dispatch` if needed. |
| `fetch-data.yml` fails with 401 | The `KOBO_TOKEN` secret is wrong or expired. |
| `fetch-data.yml` fails with 404 | The KoboToolbox asset UID changed — update `ASSET_UID` in `fetch_data.py`. |
| `deploy.yml` fails to build | Run `npm run build` locally first to reproduce the error. |
| Blank page on GitHub Pages | Confirm Pages **Source** is set to **GitHub Actions**, not a branch — a branch-based source serves raw repo files, not the Vite build output. |

## Project structure

```
index.html              # Vite entry point
src/                     # React app (pages, components, hooks, utils)
public/data/             # dev-time data snapshot; overwritten at build time from root data/
data/                    # live per-state data files, refreshed hourly by fetch-data.yml
fetch_data.py            # KoboToolbox → data/*.json
.github/workflows/
  fetch-data.yml          # hourly data fetch
  deploy.yml               # build + deploy to GitHub Pages
```
