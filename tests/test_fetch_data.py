"""Starter unit tests for fetch_data.py — seeded by QUALITY_CHECK.md.

These cover the pure helpers in fetch_data.py so any regression in the
KoboToolbox → data.json cleaning pipeline is caught before it ships to
GitHub Pages. Run with `python -m unittest tests/test_fetch_data.py`.

Prerequisite: fetch_data.py's module-level guard exits when KOBO_TOKEN is
unset, so we set a dummy token before import.
"""
import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("KOBO_TOKEN", "dummy-for-tests")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_data  # noqa: E402


class ParseDateTests(unittest.TestCase):
    def test_iso_date_kept(self):
        self.assertEqual(fetch_data.parse_date("2026-08-06"), "2026-08-06")

    def test_iso_datetime_trimmed_to_date(self):
        self.assertEqual(fetch_data.parse_date("2026-08-06T14:32:00Z"), "2026-08-06")

    def test_empty_becomes_empty(self):
        for empty in ("", "  ", None, "None", "nan"):
            self.assertEqual(fetch_data.parse_date(empty), "")

    def test_excel_serial_date_converted(self):
        # Excel serial 46232 == 2026-08-06 (30 Dec 1899 epoch)
        self.assertEqual(fetch_data.parse_date(46232), "2026-08-06")

    def test_garbage_returns_empty(self):
        self.assertEqual(fetch_data.parse_date("not-a-date"), "")


class YesNoTests(unittest.TestCase):
    def test_truthy_variants(self):
        for v in ("yes", "YES", "Yes", "1", "true", "True"):
            self.assertEqual(fetch_data.yesno(v), "Yes")

    def test_falsy_variants(self):
        for v in ("no", "0", "false", "", "maybe", None):
            self.assertEqual(fetch_data.yesno(v), "No")


class SafeCoercionTests(unittest.TestCase):
    def test_safe_int(self):
        self.assertEqual(fetch_data.safe_int("5"), 5)
        self.assertEqual(fetch_data.safe_int("5.7"), 5)
        self.assertEqual(fetch_data.safe_int(None), 0)
        self.assertEqual(fetch_data.safe_int("abc"), 0)

    def test_safe_float_rounded(self):
        self.assertEqual(fetch_data.safe_float("3.14159"), 3.1)
        self.assertEqual(fetch_data.safe_float("bad"), 0.0)

    def test_safe_str_strips_placeholders(self):
        self.assertEqual(fetch_data.safe_str("  hello  "), "hello")
        for placeholder in ("None", "nan", "—"):
            self.assertEqual(fetch_data.safe_str(placeholder), "")


class GHelperTests(unittest.TestCase):
    """`g(row, key)` should transparently strip the grp_authed/ prefix."""

    def test_prefixed_key_wins(self):
        row = {"grp_authed/foo": "prefixed", "foo": "bare"}
        self.assertEqual(fetch_data.g(row, "foo"), "prefixed")

    def test_falls_back_to_bare_key(self):
        row = {"foo": "bare"}
        self.assertEqual(fetch_data.g(row, "foo"), "bare")

    def test_missing_returns_empty(self):
        self.assertEqual(fetch_data.g({}, "foo"), "")


class CleanRowSmokeTests(unittest.TestCase):
    """`clean(row)` is the heart of the pipeline — regressions here silently
    corrupt the dashboard. This is a smoke test; extend it with fixtures per
    LGA / activity type as the schema evolves.
    """

    def test_geofence_inside_marker(self):
        row = {
            "today": "2026-08-06",
            "grp_authed/auth_lc_lgalabel": "Kano Municipal",
            "grp_authed/auth_lc_name": "Coord A",
            "grp_authed/grp_geofence/result": "✅ Inside",
            "grp_authed/activity_type": "training",
        }
        cleaned = fetch_data.clean(row)
        self.assertEqual(cleaned["status"], "inside")
        self.assertEqual(cleaned["date"], "2026-08-06")
        self.assertEqual(cleaned["lga"], "Kano Municipal")
        self.assertEqual(cleaned["coord"], "Coord A")

    def test_geofence_outside_marker(self):
        row = {
            "today": "2026-08-06",
            "grp_authed/auth_lc_lgalabel": "Kano Municipal",
            "grp_authed/auth_lc_name": "Coord A",
            "grp_authed/grp_geofence/result": "Outside LGA",
            "grp_authed/activity_type": "supervision",
        }
        cleaned = fetch_data.clean(row)
        self.assertEqual(cleaned["status"], "outside")


if __name__ == "__main__":
    unittest.main()
