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


def safe_str(v):
    s = str(v).strip()
    return "" if s in ("None", "nan", "—") else s


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

    activity = str(row.get("grp_authed/activity_type", ""))
    codes = activity.split()

    # --- Issue fields: use actual computed fields from API ---
    # Challenges: dct_challenges Yes/No
    challenges = yesno(g(row, "grp_dct/dct_challenges"))

    # Critical: show_critical starts with "Yes" when escalated
    critical_raw = str(g(row, "grp_summary/show_critical")).strip().lower()
    critical = "Yes" if critical_raw.startswith("yes") else "No"

    # Device: sum_device_issues > 0 OR sum_unresolved_devices > 0
    device_count = safe_int(g(row, "grp_summary/sum_device_issues"))
    unresolved   = safe_int(g(row, "grp_summary/sum_unresolved_devices"))
    device = "Yes" if (device_count > 0 or unresolved > 0) else "No"

    # Device logged zero flag: device=Yes but both counts=0 (data quality issue)
    # We detect this by checking if show_critical-style field exists for device
    # Since we can't access the raw question, we flag when device=No but
    # a manual review shows discrepancy — instead, flag dynamically:
    # device_zero_flag = device count is 0 but we still want to track
    # NOTE: we add a separate field for this data quality check
    device_yes_zero = "Yes" if (device_count == 0 and unresolved == 0 and
                                 str(g(row, "grp_summary/sum_device_issues")).strip() not in ("", "None", "nan")) else "No"
    # Simpler: we can't detect this from API alone, skip the flag field here
    # The insights page will handle it by cross-referencing

    # Security: sum_security_flag Yes/No
    security = yesno(g(row, "grp_summary/sum_security_flag"))

    # --- DC metrics ---
    dcs_present = safe_int(g(row, "grp_summary/sum_dcs_present"))
    dcs_partial = safe_int(g(row, "grp_summary/sum_dcs_partial"))
    dcs_absent  = safe_int(g(row, "grp_summary/sum_dcs_absent"))
    forms_completed = safe_int(g(row, "grp_summary/sum_forms_completed"))

    # --- Outside reason ---
    outside_reason = safe_str(g(row, "grp_geofence/outside_lga_reason"))

    return {
        "date":           date_str,
        "coord":          coord,
        "lga":            lga,
        "status":         status,
        "dist_km":        safe_float(g(row, "grp_geofence/distance_loc_lga")),
        "outside_reason": outside_reason,
        # Activity flags
        "training":       1 if "dct"     in codes else 0,
        "fieldCoord":     1 if "field"   in codes else 0,
        "supervision":    1 if "sup"     in codes else 0,
        "dataMonitor":    1 if "mon"     in codes else 0,
        "stakeholder":    1 if "stk"     in codes else 0,
        "teamMgmt":       1 if "tmg"     in codes else 0,
        "problemSolving": 1 if "esc"     in codes else 0,
        "transit":        1 if "transit" in codes else 0,
        # Coverage
        "wards":          safe_int(g(row, "grp_summary/show_wards")),
        "settlements":    safe_int(g(row, "grp_summary/show_settlements")),
        "hh":             safe_int(g(row, "grp_summary/show_households")),
        # DC metrics
        "dcs":            dcs_present,
        "dcs_partial":    dcs_partial,
        "dcs_absent":     dcs_absent,
        "forms_completed":forms_completed,
        # Issues
        "challenges":     challenges,
        "critical":       critical,
        "device":         device,
        "device_count":   device_count,
        "security":       security,
    }


def main():
    print(f"Fetching submissions for asset {ASSET_UID} ...")
    raw = fetch_all_submissions()
    print(f"  Got {len(raw)} raw submissions")

    cleaned = [clean(r) for r in raw]
    valid = [r for r in cleaned if r["date"] and r["lga"]]
    valid.sort(key=lambda r: (r["date"], r["lga"]))
    print(f"  Valid rows: {len(valid)}")

    print(f"  Challenges Yes:  {sum(1 for r in valid if r['challenges']=='Yes')}")
    print(f"  Critical Yes:    {sum(1 for r in valid if r['critical']=='Yes')}")
    print(f"  Device Yes:      {sum(1 for r in valid if r['device']=='Yes')}")
    print(f"  Security Yes:    {sum(1 for r in valid if r['security']=='Yes')}")
    print(f"  Device Yes+zero count:{sum(1 for r in valid if r['device']=='Yes' and r['device_count']==0)}")

    output = {
        "fetched_at": (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M WAT"),
        "total":      len(valid),
        "rows":       valid,
    }

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(f"  Written {len(valid)} rows to data.json")


if __name__ == "__main__":
    main()
