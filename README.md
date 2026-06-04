# SARMAAN LGA Coordinator Dashboard

Live dashboard for the Kano AMR project — auto-refreshes every hour from KoboToolbox.

## How it works

1. A **GitHub Action** runs every hour, fetches all submissions from KoboToolbox using your API token (stored as a secret), and writes `public/data.json`
2. **GitHub Pages** serves `public/index.html`, which reads `data.json` and renders the dashboard
3. No server needed — fully static, completely free

---

## Setup (one-time, ~10 minutes)

### Step 1 — Create the GitHub repo

1. Go to [github.com](https://github.com) and click **New repository**
2. Name it `sarmaan-dashboard` (or anything you like)
3. Set it to **Public** (required for free GitHub Pages)
4. Click **Create repository**

### Step 2 — Upload these files

Upload all files from this folder into the repo, keeping the folder structure:
```
.github/
  workflows/
    fetch-data.yml
fetch_data.py
public/
  index.html
  data.json
README.md
```

The easiest way: on the repo page, click **Add file → Upload files**, drag everything in.

### Step 3 — Add your KoboToolbox API token as a secret

1. In your repo, go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `KOBO_TOKEN`
4. Value: paste your KoboToolbox API token
5. Click **Add secret**

Your token is now stored securely — it never appears in any file.

### Step 4 — Enable GitHub Pages

1. In your repo, go to **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, Folder: `/public`
4. Click **Save**

After a minute, GitHub will show you a URL like:
`https://YOUR-USERNAME.github.io/sarmaan-dashboard/`

### Step 5 — Run the Action for the first time

1. Go to **Actions** tab in your repo
2. Click **Fetch KoboToolbox Data** in the left sidebar
3. Click **Run workflow → Run workflow**

This fetches the data immediately. After it completes, open your GitHub Pages URL — the dashboard will be live.

---

## Ongoing use

- The GitHub Action runs **automatically every hour** — no manual steps needed
- Share the GitHub Pages URL with the project manager; they can bookmark it
- The dashboard shows the timestamp of the last data fetch in the header
- To trigger an immediate refresh: go to Actions → Fetch KoboToolbox Data → Run workflow

## Changing the refresh frequency

Edit `.github/workflows/fetch-data.yml` and change the cron line:
- Every hour: `0 * * * *`
- Every 30 min: `*/30 * * * *`
- Twice daily: `0 8,20 * * *`
- Daily at 9am UTC: `0 9 * * *`

## Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard shows "Data fetch failed" | The Action hasn't run yet — go to Actions and run it manually |
| Action fails with 401 error | Your API token is wrong or expired — update the `KOBO_TOKEN` secret |
| Action fails with 404 error | The asset UID in `fetch_data.py` may have changed — update `ASSET_UID` |
| No new data appearing | Check the Actions tab for errors; KoboToolbox may be rate-limiting |
