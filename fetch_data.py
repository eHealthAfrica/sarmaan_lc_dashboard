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
    if not value or str(value).strip() in ("", "None", "nan"):
        return ""
    s = str(value).strip()
    try:
        datetime.strptime(s[:10], "%Y-%m-%d")
        return s[:10]
    except ValueError:
        pass
    try:
        serial = int(float(s))
        if 40000 < serial < 60000:
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


def g(row, key):
    """Get a field, trying both with and without grp_authed/ prefix."""
    return row.get(f"grp_authed/{key}", row.get(key, ""))


def clean(row):
    date_str = parse_date(row.get("today", ""))
    if not date_str:
        date_str = parse_date(g(row, "grp_exercise/report_date"))

    lga    = str(g(row, "auth_lc_lgalabel")).strip()
    coord  = str(g(row, "auth_lc_name") or row.get("username", "")).strip()
    result = str(g(row, "grp_geofence/result"))
    status = "inside" if ("✅" in result or "Inside" in result) else "outside"

    # Activity types — note the API uses activity_type as a space-separated string
    activity = str(g(row, "activity_type"))

    return {
        "date":          date_str,
        "coord":         coord,
        "lga":           lga,
        "status":        status,
        "dist_km":       safe_float(g(row, "grp_geofence/distance_loc_lga")),
        "training":      1 if "dct" in activity.split() else 0,
        "fieldCoord":    1 if "field" in activity.split() else 0,
        "supervision":   1 if "sup" in activity.split() else 0,
        "dataMonitor":   1 if "mon" in activity.split() else 0,
        "stakeholder":   1 if "stk" in activity.split() else 0,
        "teamMgmt":      1 if "tmg" in activity.split() else 0,
        "problemSolving":1 if "esc" in activity.split() else 0,
        "transit":       1 if "transit" in activity.split() else 0,
        "wards":         safe_int(g(row, "grp_summary/show_wards")),
        "settlements":   safe_int(g(row, "grp_summary/show_settlements")),
        "dcs":           safe_int(g(row, "grp_summary/sum_dcs_present")),
        "hh":            safe_int(g(row, "grp_summary/show_households")),
        "challenges":    yesno(g(row, "grp_dct/dct_challenges")),
        "critical":      yesno(g(row, "grp_summary/show_critical")),
        "device":        yesno(g(row, "grp_summary/sum_device_issues")),
        "security":      yesno(g(row, "grp_summary/sum_security_flag")),
    }


def main():
    print(f"Fetching submissions for asset {ASSET_UID} ...")
    raw = fetch_all_submissions()
    print(f"  Got {len(raw)} raw submissions")
    if raw:
        print("  activity_type sample:", repr(raw[0].get("grp_authed/activity_type", "NOT FOUND")))
        all_codes = set()
        for r in raw:
            for code in str(r.get("grp_authed/activity_type", "")).split():
                all_codes.add(code)
        print("  all unique activity codes:", sorted(all_codes))
    cleaned = [clean(r) for r in raw]

    if cleaned:
        print(f"  Sample: date={cleaned[0]['date']!r} lga={cleaned[0]['lga']!r} coord={cleaned[0]['coord']!r} status={cleaned[0]['status']!r}")

    valid = [r for r in cleaned if r["date"] and r["lga"]]
    valid.sort(key=lambda r: (r["date"], r["lga"]))
    print(f"  Valid rows: {len(valid)}")

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
