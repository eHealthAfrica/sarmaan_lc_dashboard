# SARMAAN — LGA Coordinator Dashboard

A live, zero-infrastructure dashboard that visualises daily field submissions from LGA Coordinators (LCs) for the **SARMAAN / Kano AMR project**. Data is pulled from **KoboToolbox** every hour by a scheduled **GitHub Action**, written to a static `data.json`, and rendered client-side by a Chart.js dashboard hosted on **GitHub Pages**.

No server, no database, no hosting bill — just a public repository, a scheduled workflow, and a static page.

---

## Table of contents

1. [What the dashboard shows](#what-the-dashboard-shows)
2. [Architecture](#architecture)
3. [Repository layout](#repository-layout)
4. [Data pipeline](#data-pipeline)
5. [Local development](#local-development)
6. [Deployment (one-time setup)](#deployment-one-time-setup)
7. [Ongoing operation](#ongoing-operation)
8. [Configuration reference](#configuration-reference)
9. [Extending the dashboard](#extending-the-dashboard)
10. [Troubleshooting](#troubleshooting)
11. [Security notes](#security-notes)
12. [License & credits](#license--credits)

---

## What the dashboard shows

The dashboard has two pages (linked from the left sidebar):

### 1. `index.html` — Operations dashboard
The default landing page. Shows the current operational picture across all LGAs and coordinators:

- **KPI strip** — total reports, unique LCs reporting, unique LGAs covered, households visited, wards covered, settlements covered, and forms completed.
- **Activity breakdown** — proportion of visits spent on training (DCT), field coordination, supervision, data monitoring, stakeholder engagement, team management, problem solving / escalations, and transit.
- **Geofence status** — how many submissions were logged from *inside* vs *outside* the assigned LGA, with reasons collected for out-of-LGA visits.
- **DC roster** — number of Data Collectors reported present / partially present / absent per submission.
- **Issue signals** — counts of submissions flagging challenges, critical issues, device issues (with per-device detail), and security incidents.

### 2. `insights.html` — Trend & drill-down insights
Same underlying data, but rolled up over time and by coordinator/LGA to expose trends, outliers and repeat issues.

Both pages share the same left-hand navigation and the same underlying `data.json`.

### Filters
Every view can be filtered by:
- **Date** (multi-select checklist dropdown)
- **LGA**
- **LC (coordinator)**
- **Activity type**

Filters combine (AND) and are reflected in every KPI, chart, and table on the page. A *Reset* button clears them all.

### Freshness
The header shows the timestamp of the last successful KoboToolbox fetch, in **West Africa Time (WAT)**, plus a coloured status dot:

| Dot | Meaning |
|---|---|
| 🟢 Green | Data loaded successfully |
| 🟠 Amber | Loading in progress |
| 🔴 Red | Fetch failed (see the error bar) |

---

## Architecture

```
┌────────────────────┐   hourly    ┌───────────────────────────┐   commit    ┌──────────────────┐
│  KoboToolbox API   │◄────────────│  GitHub Action            │────────────►│  GitHub repo     │
│  (survey backend)  │  Token auth │  fetch_data.py            │  data.json  │  main branch     │
└────────────────────┘             └───────────────────────────┘             └────────┬─────────┘
                                                                                      │
                                                                                      │ Pages
                                                                                      ▼
                                                                          ┌───────────────────────┐
                                                                          │  GitHub Pages         │
                                                                          │  index.html + JS +    │
                                                                          │  data.json (static)   │
                                                                          └───────────────────────┘
                                                                                      │
                                                                                      ▼
                                                                              End users (browser)
```

Key properties:

- **Stateless & static.** The browser fetches `data.json` and renders everything client-side. There is no backend to keep alive.
- **No secrets in the browser.** The KoboToolbox API token lives only in a GitHub Actions secret. The published `data.json` contains only cleaned, non-sensitive fields.
- **Auditable refreshes.** Every refresh is a commit on `main` authored by `github-actions[bot]`, so the full history of what the dashboard looked like at any moment is preserved in Git.

---

## Repository layout

```
.
├── .github/
│   └── workflows/
│       └── fetch-data.yml     # Hourly cron job that runs fetch_data.py
├── assets/
│   ├── dashboard.css          # Shared styles (design tokens, responsive, a11y)
│   ├── dashboard.js           # Shared behaviour (sidebar, filters, data loader)
│   └── logo.png               # Extracted from the old inline base64 blob
├── public/
│   ├── index.html             # Legacy standalone dashboard (kept for reference)
│   └── data.json              # Placeholder — real data lives at repo root
├── fetch_data.py              # Kobo → data.json pipeline (Python 3, stdlib only)
├── index.html                 # Operations dashboard (loads assets/*)
├── insights.html              # Trends & insights view (loads assets/*)
├── data.json                  # Latest cleaned dataset (rewritten hourly)
└── README.md                  # You are here
```

> **Note on `public/` vs repo root.** GitHub Pages is currently configured to serve the `/public` folder. If you deploy from `/public`, make sure the workflow writes `data.json` into `public/` (see the [Configuration reference](#configuration-reference)). The bundled workflow writes `data.json` to the repo root — adjust either the workflow or the Pages source so they agree.

---

## Data pipeline

`fetch_data.py` is a single-file, standard-library-only Python 3 script. It:

1. Reads `KOBO_TOKEN` from the environment (populated from the `KOBO_TOKEN` GitHub secret).
2. Paginates through every submission for the configured `ASSET_UID` at `https://kf.kobotoolbox.org/api/v2/assets/<uid>/data/`.
3. Normalises each submission with `clean(row)` — parsing dates, coercing yes/no fields, splitting activity codes, and pulling out nested repeat groups (device issues, DC roster, security incidents).
4. Drops rows without a usable date or LGA.
5. Sorts rows by `(date, lga)` for deterministic diffs.
6. Writes a compact JSON document to `data.json` in this shape:

   ```json
   {
     "fetched_at": "2026-07-07 09:00 WAT",
     "total": 1234,
     "rows": [ { "date": "...", "coord": "...", "lga": "...", ... }, ... ]
   }
   ```

Key per-row fields consumed by the frontend include:
`date`, `coord`, `lga`, `status` (inside/outside geofence), `dist_km`, `outside_reason`, activity flags (`training`, `fieldCoord`, `supervision`, `dataMonitor`, `stakeholder`, `teamMgmt`, `problemSolving`, `transit`), `wards`, `settlements`, `hh`, DC roster counts (`dcs`, `dcs_partial`, `dcs_absent`), `forms_completed`, and issue flags (`challenges`, `critical`, `device`, `device_count`, `device_details`, `security`, and their `_desc` counterparts).

---

## Local development

You only need Python 3 (for regenerating `data.json`) and any static file server (for previewing the dashboard).

```bash
# 1. Clone
git clone https://github.com/eHealthAfrica/sarmaan_lc_dashboard.git
cd sarmaan_lc_dashboard

# 2. (Optional) Regenerate data.json against live Kobo
export KOBO_TOKEN="your-kobo-api-token"     # PowerShell: $env:KOBO_TOKEN = "..."
python3 fetch_data.py

# 3. Serve locally
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

The dashboard has no build step — `index.html` and `insights.html` load Chart.js from a CDN and read `data.json` directly.

---

## Deployment (one-time setup, ~10 min)

### 1. Fork / create the repo
Fork this repository or create a new **public** repo (required for the free GitHub Pages tier) and upload the contents preserving the folder structure.

### 2. Add the KoboToolbox token as a secret
`Settings → Secrets and variables → Actions → New repository secret`

- **Name:** `KOBO_TOKEN`
- **Value:** your KoboToolbox API token (generate at `https://kf.kobotoolbox.org/#/account-settings`)

The token never appears in any committed file.

### 3. Enable GitHub Pages
`Settings → Pages`

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/public` *(or `/root` if you prefer serving from the repository root — pick one and make sure `data.json` lands there)*

Save. After a minute, GitHub reports the live URL, e.g.
`https://ehealthafrica.github.io/sarmaan_lc_dashboard/`.

### 4. Kick off the first data fetch
`Actions → Fetch KoboToolbox Data → Run workflow → Run workflow`

This runs immediately instead of waiting for the next hourly slot. When it finishes, refresh the Pages URL.

---

## Ongoing operation

- The workflow runs automatically on the top of every hour (`0 * * * *`, UTC).
- Each run makes exactly one commit on `main` (`chore: refresh data …`) if the data actually changed; otherwise it is a no-op.
- End users only need to bookmark the Pages URL. They never touch GitHub.
- To force an immediate refresh, use `Actions → Fetch KoboToolbox Data → Run workflow`.

---

## Configuration reference

### Change the refresh frequency
Edit the cron expression in [.github/workflows/fetch-data.yml](.github/workflows/fetch-data.yml):

| Cadence | Cron |
|---|---|
| Every hour (default) | `0 * * * *` |
| Every 30 minutes | `*/30 * * * *` |
| Twice daily (08:00 & 20:00 UTC) | `0 8,20 * * *` |
| Daily at 09:00 UTC | `0 9 * * *` |

### Point at a different KoboToolbox asset
Update `ASSET_UID` at the top of [fetch_data.py](fetch_data.py). If you use a self-hosted Kobo instance, also update `KOBO_BASE`.

### Serve from repo root instead of `/public`
Either:
- change the workflow's `git add data.json` to `git add public/data.json` and have the script write `public/data.json`, **or**
- set the Pages source to serve from `/` (root) so the workflow's current output location matches.

---

## Extending the dashboard

- **New KPI or chart:** all rendering happens in `index.html` / `insights.html`. Add your Chart.js block and a filter-aware aggregation over the `rows` array.
- **New Kobo field:** add it to `clean(row)` in `fetch_data.py` (use the `g(row, "…")` helper so it works whether or not the field lives under `grp_authed/`) and consume it in the frontend on the next hourly run.
- **New page:** copy `insights.html`, add a link in the sidebar `.nav-link` list, and it will inherit the same data feed automatically.

---

## Troubleshooting

| Symptom | Likely cause & fix |
|---|---|
| Dashboard header shows **"Data fetch failed"** | The workflow has never succeeded on this repo. Run it manually from the Actions tab and inspect the log. |
| Action fails with **HTTP 401** | `KOBO_TOKEN` is missing, wrong, or has been rotated. Update the repository secret. |
| Action fails with **HTTP 404** | The `ASSET_UID` in `fetch_data.py` no longer exists on Kobo — get the current UID from the Kobo project URL. |
| Action succeeds but the dashboard is empty | `data.json` may be in the wrong folder for your Pages source. See [Configuration reference](#configuration-reference). |
| Data stops refreshing after ~60 days of no activity | GitHub disables scheduled workflows on inactive repos. Push any commit (or re-enable the workflow) to reactivate. |
| Numbers look wrong for a specific LGA | Filter to that LGA and open the raw `data.json` for the same rows — the frontend never mutates the file, so mismatches usually mean the underlying Kobo form changed. Re-check `clean(row)`. |

---

## Security notes

- The KoboToolbox token is stored **only** as an encrypted GitHub Actions secret and is never written into `data.json` or the workflow log.
- `data.json` should not contain PII beyond what LCs are already reporting (LGA, coordinator name, activity, roster counts). Review new fields before adding them to `clean(row)`.
- Because the repo must be **public** for free GitHub Pages, treat everything in `data.json` as world-readable. If you need to hide fields, either drop them in `clean(row)` or move to a private repo with GitHub Pages on a paid plan.

---

## License & credits

Built for the **SARMAAN / Kano AMR** programme at **eHealth Africa**.

Third-party dependencies:
- [Chart.js 4.4.1](https://www.chartjs.org/) — MIT
- [KoboToolbox API v2](https://kf.kobotoolbox.org/api/v2/)

Data pipeline and dashboard authored by the SARMAAN data team.
