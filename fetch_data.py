"""
Fetches all submissions from KoboToolbox for each configured state and
writes one data-*.json file per state. Run by the GitHub Action using the
KOBO_TOKEN environment variable.

Each state is independent - if one asset fails to fetch or its rows don't
clean into anything valid, that state's existing output file is left alone
and the others still update. See STATES below to add another state.
"""

import os, json, sys
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request

KOBO_BASE = "https://kf.kobotoolbox.org"
TOKEN     = os.environ.get("KOBO_TOKEN", "")

if not TOKEN:
    print("ERROR: KOBO_TOKEN environment variable not set.", file=sys.stderr)
    sys.exit(1)

# slug is only used for logging; output_file is what actually matters -
# it must match a state's `dataFile` in src/config/states.js (each is
# written into DATA_DIR below, e.g. dataFile 'data/data.json').
DATA_DIR = "data"

STATES = [
    {"slug": "kano",   "asset_uid": "akucQN6di4hAxuVEZCku4Z", "output_file": "data.json"},
    {"slug": "jigawa", "asset_uid": "a7qHTwCANtBbdKV4qD8pTa", "output_file": "data-jigawa.json"},
    {"slug": "kaduna", "asset_uid": "ajUiQQpWdWDZ5uRnBqjwWp", "output_file": "data-kaduna.json"},
    {"slug": "bauchi", "asset_uid": "aEUnQ92SFKZetU9Yrt6cX6", "output_file": "data-bauchi.json"},
    # A separate "Kano Coverage" survey, distinct from the original Kano AMR
    # asset above - different form/asset, own output file, does not touch
    # the long-running Kano AMR data.json.
    {"slug": "kanocoverage", "asset_uid": "a2UpJGWQyP2LdA4nFREgGg", "output_file": "data-kanocoverage.json"},
]


def kobo_get(url):
    req = Request(url, headers={"Authorization": f"Token {TOKEN}"})
    with urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def fetch_all_submissions(asset_uid):
    results = []
    url = f"{KOBO_BASE}/api/v2/assets/{asset_uid}/data/?format=json&limit=500"
    while url:
        data = kobo_get(url)
        results.extend(data.get("results", []))
        url = data.get("next")
    return results


def parse_iso_datetime(value, assume_utc_if_naive=False):
    if not value:
        return None
    s = str(value).strip()
    if not s or s in ("None", "nan"):
        return None
    s = s.replace("Z", "+00:00")
    dt = None
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        try:
            dt = datetime.fromisoformat(s[:19])
        except ValueError:
            return None
    if dt.tzinfo is None and assume_utc_if_naive:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def compute_hours_worked(start_raw, submit_raw):
    """Hours between when the LC opened the form (system `starttime`, tz-aware)
    and when it hit the server (`_submission_time`, assumed UTC if no offset
    given). Returns 0.0 if either timestamp is missing/unparseable, or if the
    result is negative or implausibly large (>24h) - almost certainly a
    parsing/timezone mismatch rather than a real work duration."""
    start  = parse_iso_datetime(start_raw)
    submit = parse_iso_datetime(submit_raw, assume_utc_if_naive=True)
    if not start or not submit:
        return 0.0
    try:
        delta = (submit - start).total_seconds() / 3600
    except TypeError:
        # one ended up aware and the other naive - fall back to a naive diff
        delta = (submit.replace(tzinfo=None) - start.replace(tzinfo=None)).total_seconds() / 3600
    if delta < 0 or delta > 24:
        return 0.0
    return round(delta, 2)


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


def find_by_suffix(row, suffix):
    """Scan all grp_authed/* fields for one whose last path segment ends
    with `suffix`, returning the first non-empty match.

    Some questions (e.g. the daily challenges Yes/No) live under a
    different question group depending on which activity type was
    selected: grp_dct/dct_challenges for 'dct' (Kano AMR's original),
    grp_log/log_challenges - a copy applying to every other activity type
    (Jigawa/Kaduna/Bauchi), and grp_tmg/tmg_challenges for 'tmg' (seen in
    Kano Coverage) - and there will likely be more per-activity-type group
    names as the form keeps evolving. A given row only ever has the ONE
    group matching its actual activity_type populated, so scanning for the
    suffix instead of hardcoding every group name is both simpler and
    future-proof against the next new group name."""
    for key, val in row.items():
        if not key.startswith("grp_authed/"):
            continue
        last_segment = key.rsplit("/", 1)[-1]
        if last_segment.endswith(suffix) and val not in (None, "", "—"):
            return val
    return ""


def pick_lga_name(row):
    """auth_lc_lgalabel and auth_lc_lganame hold the display name and the
    lowercase/underscored slug - but which field is which is NOT
    consistent across states (Kano: lgalabel='Tsanyawa', lganame='tsanyawa';
    Jigawa: lgalabel='kiri_kasamma', lganame='Kiri Kasamma' - swapped).
    Pick whichever value isn't all-lowercase, since every real LGA name is
    Title Case and every slug is all-lowercase."""
    a = str(g(row, "auth_lc_lgalabel")).strip()
    b = str(g(row, "auth_lc_lganame")).strip()
    if a and a != a.lower():
        return a
    if b and b != b.lower():
        return b
    return a or b


def clean(row):
    date_str = parse_date(row.get("today", ""))
    if not date_str:
        date_str = parse_date(g(row, "grp_exercise/report_date"))

    lga    = pick_lga_name(row)
    ward   = str(g(row, "auth_lc_wardname") or g(row, "grp_location/active_ward")).strip()
    coord  = str(g(row, "auth_lc_name") or row.get("username", "")).strip()
    result = str(g(row, "grp_geofence/result"))
    status = "inside" if ("✅" in result or "Inside" in result) else "outside"

    # Ward-level geofence - only asked by Jigawa's form (grp_geofence_ward).
    # Empty string (not "outside") when the question doesn't exist for this
    # row at all, so states without ward tracking don't show as 100% outside.
    ward_result = str(g(row, "grp_geofence_ward/ward_result")).strip()
    ward_status = ("inside" if ("✅" in ward_result or "Inside" in ward_result) else "outside") if ward_result else ""

    activity = str(row.get("grp_authed/activity_type", ""))
    codes = activity.split()

    # "Type(s) of activity supported today" (select_multiple survey_types,
    # field name survey_type) - a separate question from activity_type
    # above. Feeds the Activity filter dropdown; activity_type above still
    # feeds the Activity Types Breakdown chart, untouched.
    survey_type = str(g(row, "survey_type")).strip()

    # Challenges: whichever activity-type-specific group has it (see
    # find_by_suffix above)
    challenges = yesno(find_by_suffix(row, "_challenges"))

    # Critical: actual question field
    critical = yesno(row.get("grp_authed/grp_dc_roster/critical_issues_any", "no"))

    # Device: actual question field
    device = yesno(row.get("grp_authed/grp_devices/device_issues_any", "no"))

    # Device count: length of the device_issues list (actual logged devices)
    device_issues_list = row.get("grp_authed/grp_devices/device_issues", [])
    device_count = len(device_issues_list) if isinstance(device_issues_list, list) else safe_int(device_issues_list)

    # Security: actual question field
    security = yesno(row.get("grp_authed/grp_security/security_incident_any", "no"))

    dcs_present     = safe_int(g(row, "grp_summary/sum_dcs_present"))
    dcs_partial     = safe_int(g(row, "grp_summary/sum_dcs_partial"))
    dcs_absent      = safe_int(g(row, "grp_summary/sum_dcs_absent"))
    forms_completed = safe_int(g(row, "grp_summary/sum_forms_completed"))
    outside_reason  = safe_str(g(row, "grp_geofence/outside_lga_reason"))

    # Hours worked: system `starttime` (when the LC opened the form) to
    # `_submission_time` (when it reached the server) - for the monthly
    # timesheet. Not activity_type's grp_exercise/start_time, which is a
    # separate, user-entered field.
    hours_worked = compute_hours_worked(row.get("starttime", ""), row.get("_submission_time", ""))

    return {
        "date":           date_str,
        "coord":          coord,
        "lga":            lga,
        "ward":           ward,
        "status":         status,
        "ward_status":    ward_status,
        "hours_worked":   hours_worked,
        "survey_type":    survey_type,
        "dist_km":        safe_float(g(row, "grp_geofence/distance_loc_lga")),
        "outside_reason": outside_reason,
        "training":       1 if "dct"     in codes else 0,
        "fieldCoord":     1 if "field"   in codes else 0,
        "supervision":    1 if "sup"     in codes else 0,
        "dataMonitor":    1 if "mon"     in codes else 0,
        "stakeholder":    1 if "stk"     in codes else 0,
        "teamMgmt":       1 if "tmg"     in codes else 0,
        "problemSolving": 1 if "esc"     in codes else 0,
        "transit":        1 if "transit" in codes else 0,
        "wards":          safe_int(g(row, "grp_summary/show_wards")),
        "settlements":    safe_int(g(row, "grp_summary/show_settlements")),
        "hh":             safe_int(g(row, "grp_summary/show_households")),
        "dcs":            dcs_present,
        "dcs_partial":    dcs_partial,
        "dcs_absent":     dcs_absent,
        "forms_completed":forms_completed,
        "challenges":     challenges,
        "challenge_desc": safe_str(find_by_suffix(row, "_challenge_desc")),
        "critical":       critical,
        "critical_desc":  safe_str(row.get("grp_authed/grp_dc_roster/critical_issues_desc", "")),
        "device":         device,
        "device_count":   device_count,
        "device_details": [
            {
                "owner":   safe_str(d.get("grp_authed/grp_devices/device_issues/device_owner","")),
                "type":    safe_str(d.get("grp_authed/grp_devices/device_issues/device_issue_type","")),
                "desc":    safe_str(d.get("grp_authed/grp_devices/device_issues/device_issue_desc","")),
                "resolved":safe_str(d.get("grp_authed/grp_devices/device_issues/device_issue_resolved","")),
                "action":  safe_str(d.get("grp_authed/grp_devices/device_issues/device_pending_action",""))
            }
            for d in (device_issues_list if isinstance(device_issues_list, list) else [])
        ],
        "security":       security,
        "security_desc":  safe_str(row.get("grp_authed/grp_security/security_desc", "")),
        "security_location": safe_str(row.get("grp_authed/grp_security/security_location", "")),
        "security_action":safe_str(row.get("grp_authed/grp_security/security_action", "")),
    }


def print_debug(raw):
    """Diagnostic output to make field-mapping mismatches visible in the
    Action log immediately, instead of needing another round-trip like the
    original Kano field discovery did."""
    if not raw:
        return
    first = raw[0]
    keywords = ("state", "lga", "ward", "auth", "result", "critical", "device",
                "security", "challenge", "log", "dct", "summary")
    keyword_keys = sorted(k for k in first.keys() if any(w in k.lower() for w in keywords))
    print(f"  --- DEBUG: keys matching {'/'.join(keywords)} ---")
    for k in keyword_keys:
        val = first[k]
        # polygon/geo lists are huge and irrelevant here - keep the log readable
        if isinstance(val, list) and len(val) > 3:
            val = f"[list of {len(val)} items, omitted]"
        print(f"    {k}: {val!r}")
    print("  --- END DEBUG ---")

    # Timesheet hours calc - verify starttime/_submission_time parsing
    # against a few real rows before trusting the computed hours.
    print("  --- DEBUG: hours_worked calc (starttime -> _submission_time) ---")
    for r in raw[:3]:
        start_raw, submit_raw = r.get("starttime", ""), r.get("_submission_time", "")
        print(f"    starttime={start_raw!r} _submission_time={submit_raw!r} -> {compute_hours_worked(start_raw, submit_raw)}h")
    print("  --- END DEBUG ---")


def process_state(cfg):
    slug, asset_uid, output_file = cfg["slug"], cfg["asset_uid"], cfg["output_file"]
    print(f"[{slug}] Fetching submissions for asset {asset_uid} ...")
    try:
        raw = fetch_all_submissions(asset_uid)
    except Exception as e:
        print(f"[{slug}] ERROR fetching: {e}", file=sys.stderr)
        return
    print(f"[{slug}]   Got {len(raw)} raw submissions")

    print_debug(raw)

    cleaned = [clean(r) for r in raw]
    valid = [r for r in cleaned if r["date"] and r["lga"]]
    valid.sort(key=lambda r: (r["date"], r["lga"]))
    print(f"[{slug}]   Valid rows: {len(valid)}")

    if raw and not valid:
        print(f"[{slug}]   WARNING: 0 valid rows out of {len(raw)} raw - "
              f"field mapping likely doesn't match this form. Check the DEBUG "
              f"output above and compare against clean()'s field paths in "
              f"fetch_data.py before assuming the fetch itself failed.")

    print(f"[{slug}]   Challenges Yes:  {sum(1 for r in valid if r['challenges']=='Yes')}")
    print(f"[{slug}]   Critical Yes:    {sum(1 for r in valid if r['critical']=='Yes')}")
    print(f"[{slug}]   Device Yes:      {sum(1 for r in valid if r['device']=='Yes')}")
    print(f"[{slug}]   Security Yes:    {sum(1 for r in valid if r['security']=='Yes')}")

    output = {
        "fetched_at": (datetime.now(timezone.utc) + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M WAT"),
        "total":      len(valid),
        "rows":       valid,
    }

    os.makedirs(DATA_DIR, exist_ok=True)
    output_path = os.path.join(DATA_DIR, output_file)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(f"[{slug}]   Written {len(valid)} rows to {output_path}")


def main():
    for cfg in STATES:
        process_state(cfg)


if __name__ == "__main__":
    main()
