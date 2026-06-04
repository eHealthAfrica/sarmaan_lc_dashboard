"""
Fetches all submissions from KoboToolbox and writes public/data.json.
Run by the GitHub Action using KOBO_TOKEN environment variable.
"""

import os, json, sys
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

ASSET_UID = "akucQN6di4hAxuVEZCku4Z"
KOBO_BASE = "https://kf.kobotoolbox.org"
TOKEN     = os.environ.get("KOBO_TOKEN", "")

if not TOKEN:
    print("ERROR: KOBO_TOKEN environment variable not set.", file=sys.stderr)
    sys.exit(1)


def kobo_get(url):
    req = Request(url, headers={"Authorization": f"Token {TOKEN}"})
    with urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def fetch_all_submissions():
    results = []
    url = f"{KOBO_BASE}/api/v2/assets/{ASSET_UID}/data/?format=json&limit=500"
    while url:
        data = kobo_get(url)
        results.extend(data.get("results", []))
        url = data.get("next")   # KoboToolbox paginates; follow next page
    return results


def clean(row):
    def yesno(v):
        return "Yes" if str(v).strip().lower() in ("yes", "1", "true") else "No"

    def safe_float(v, default=0.0):
        try:
            return round(float(v), 1)
        except (TypeError, ValueError):
            return default

    def safe_int(v, default=0):
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return default

    # Parse date
    today_raw = row.get("today", row.get("Date of Report", ""))
    try:
        date_str = str(today_raw)[:10]   # YYYY-MM-DD
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        date_str = ""

    result_raw = row.get("result", "")
    status = "inside" if "✅" in str(result_raw) or "Inside" in str(result_raw) else "outside"

    return {
        "date":          date_str,
        "coord":         str(row.get("auth_lc_name", "")).strip(),
        "lga":           str(row.get("auth_lc_lgalabel", "")).strip(),
        "status":        status,
        "dist_km":       safe_float(row.get("Distance from LGA (km)", 0)),
        "training":      safe_int(row.get("Type(s) of activities carried out today/Survey Data Collection Training", 0)),
        "fieldCoord":    safe_int(row.get("Type(s) of activities carried out today/Field Coordination and Implementation", 0)),
        "supervision":   safe_int(row.get("Type(s) of activities carried out today/Supervision and Quality Assurance", 0)),
        "dataMonitor":   safe_int(row.get("Type(s) of activities carried out today/Data Monitoring and Reporting", 0)),
        "stakeholder":   safe_int(row.get("Type(s) of activities carried out today/Stakeholder Engagement and Advocacy", 0)),
        "teamMgmt":      safe_int(row.get("Type(s) of activities carried out today/Team Management and Support", 0)),
        "problemSolving":safe_int(row.get("Type(s) of activities carried out today/Problem Solving and Escalation", 0)),
        "transit":       safe_int(row.get("Type(s) of activities carried out today/Transit", 0)),
        "wards":         safe_int(row.get("Number of wards covered today", 0)),
        "settlements":   safe_int(row.get("Number of settlements covered today", 0)),
        "dcs":           safe_int(row.get("Total data collectors assigned to you today", 0)),
        "hh":            safe_int(row.get("Total households visited today (approximate)", 0)),
        "challenges":    yesno(row.get("Were there any challenges?", "No")),
        "critical":      yesno(row.get("Any other critical issues to escalate to State team?", "No")),
        "device":        yesno(row.get("Were there any device or technical issues today?", "No")),
        "security":      yesno(row.get("Were there any security or access incidents today?", "No")),
    }


def main():
    print(f"Fetching submissions for asset {ASSET_UID} ...")
    raw = fetch_all_submissions()
    print(f"  Got {len(raw)} raw submissions")

    cleaned = [clean(r) for r in raw]
    cleaned = [r for r in cleaned if r["date"] and r["lga"]]  # drop invalid rows
    cleaned.sort(key=lambda r: (r["date"], r["lga"]))

    output = {
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "total":      len(cleaned),
        "rows":       cleaned,
    }

    os.makedirs("public", exist_ok=True)
    with open("public/data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(f"  Written {len(cleaned)} rows to public/data.json")


if __name__ == "__main__":
    main()
