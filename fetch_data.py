"""
Fetches all submissions from KoboToolbox and writes data.json.
Run by the GitHub Action using KOBO_TOKEN environment variable.
"""

import os, json, sys
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request

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
        url = data.get("next")
    return results


def parse_date(value):
    """Handle YYYY-MM-DD strings, ISO timestamps, and Excel serial numbers."""
    if not value or str(value).strip() in ("", "None", "nan"):
        return ""
    s = str(value).strip()
    # Try YYYY-MM-DD (possibly with time suffix)
    try:
        datetime.strptime(s[:10], "%Y-%m-%d")
        return s[:10]
    except ValueError:
        pass
    # Try Excel serial number (e.g. 46155 or 46155.44)
    try:
        serial = int(float(s))
        if 40000 < serial < 60000:  # sanity check: years ~2009-2064
            return (datetime(1899, 12, 30) + timedelta(days=serial)).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        pass
    return ""


def yesno(v):
    return "Yes" if str(v).strip().lower() in ("yes", "1", "true") else "No"


def safe_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def safe_float(v):
    try:
        return round(float(v), 1)
    except (TypeError, ValueError):
        return 0.0


def clean(row):
    # Date — try multiple field names
    date_str = ""
    for field in ("today", "Date of Report", "_submission_time"):
        date_str = parse_date(row.get(field, ""))
        if date_str:
            break

    # LGA — try multiple field names
    lga = ""
    for field in ("auth_lc_lgalabel", "auth_lc_lganame", "active_lga"):
        lga = str(row.get(field, "")).strip()
        if lga and lga not in ("None", "nan"):
            break

    # Coordinator name
    coord = ""
    for field in ("auth_lc_name", "username"):
        coord = str(row.get(field, "")).strip()
        if coord and coord not in ("None", "nan"):
            break

    # Location status
    result_raw = str(row.get("result", ""))
    status = "inside" if ("✅" in result_raw or "Inside" in result_raw) else "outside"

    return {
        "date":          date_str,
        "coord":         coord,
        "lga":           lga,
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

    if raw:
        first = raw[0]
        print("  --- DEBUG: first row sample ---")
        for field in ("today", "Date of Report", "_submission_time",
                      "auth_lc_lgalabel", "auth_lc_lganame", "active_lga",
                      "auth_lc_name", "result"):
            print(f"  {field}: {repr(first.get(field, 'NOT FOUND'))}")
        print("  --- END DEBUG ---")

    cleaned = [clean(r) for r in raw]

    if cleaned:
        print(f"  Sample cleaned row: date={cleaned[0]['date']!r} lga={cleaned[0]['lga']!r} coord={cleaned[0]['coord']!r}")

    valid = [r for r in cleaned if r["date"] and r["lga"]]
    print(f"  Valid rows after filter: {len(valid)}")

    output = {
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "total":      len(valid),
        "rows":       valid,
    }

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(f"  Written {len(valid)} rows to data.json")


if __name__ == "__main__":
    main()
