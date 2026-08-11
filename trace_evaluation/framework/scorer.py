"""
Turns a project's raw TRACE scores.json into a weighted results.json.

Usage (from repo root):
    python -m trace_evaluation.framework.scorer <project_name>

Reads  trace_evaluation/assessments/<project_name>/scores.json
Writes trace_evaluation/assessments/<project_name>/results.json

scores.json shape:
{
  "project": "travel_analytics_app",
  "evaluation_target": "The Travel Analytics platform as a software product",
  "evaluated_by": "Joshua Ogundairo",
  "evaluation_date": "2026-08-11",
  "criteria": {
    "system_performance": {"score": 8.0, "justification": "..."},
    ... one entry per criterion key defined in framework/rubric.py ...
  }
}

Every criterion in the rubric must be present, and every key present must
be a known criterion — this fails loudly rather than silently under- or
over-scoring a pillar.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from trace_evaluation.framework.rubric import (
    SCORE_MAX,
    SCORE_MIN,
    TRACE_PILLARS,
    validate_rubric,
)

ASSESSMENTS_DIR = Path(__file__).resolve().parent.parent / "assessments"


class ScoreValidationError(ValueError):
    pass


def _all_criterion_keys() -> set[str]:
    return {c.key for p in TRACE_PILLARS for c in p.criteria}


def load_scores(project: str) -> dict[str, Any]:
    path = ASSESSMENTS_DIR / project / "scores.json"
    if not path.exists():
        raise FileNotFoundError(
            f"No scores.json for project '{project}' at {path}. "
            "Create one — see framework/rubric.py for the required criterion keys."
        )
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def validate_scores(scores_doc: dict[str, Any]) -> None:
    required_top = {"project", "evaluation_target", "criteria"}
    missing_top = required_top - scores_doc.keys()
    if missing_top:
        raise ScoreValidationError(f"scores.json missing top-level keys: {sorted(missing_top)}")

    criteria = scores_doc["criteria"]
    expected = _all_criterion_keys()
    given = set(criteria.keys())

    missing = expected - given
    if missing:
        raise ScoreValidationError(f"scores.json is missing criteria: {sorted(missing)}")
    extra = given - expected
    if extra:
        raise ScoreValidationError(f"scores.json has unknown criteria: {sorted(extra)}")

    for key, entry in criteria.items():
        if "score" not in entry:
            raise ScoreValidationError(f"criterion '{key}' has no 'score'")
        score = entry["score"]
        if not isinstance(score, (int, float)):
            raise ScoreValidationError(f"criterion '{key}' score must be numeric, got {type(score)}")
        if not (SCORE_MIN <= score <= SCORE_MAX):
            raise ScoreValidationError(
                f"criterion '{key}' score {score} out of range [{SCORE_MIN}, {SCORE_MAX}]"
            )
        if not entry.get("justification", "").strip():
            raise ScoreValidationError(
                f"criterion '{key}' has no justification — TRACE scores must be defensible, not asserted"
            )


def compute_results(scores_doc: dict[str, Any]) -> dict[str, Any]:
    """Weighted rollup: each pillar score is the mean of its criteria
    scores (0-10); the overall score is the weight-weighted mean of the
    five pillar scores, also on a 0-10 scale."""
    criteria = scores_doc["criteria"]
    pillar_results = []
    overall = 0.0

    for pillar in TRACE_PILLARS:
        crit_scores = [criteria[c.key]["score"] for c in pillar.criteria]
        pillar_score = sum(crit_scores) / len(crit_scores)
        overall += pillar_score * (pillar.weight_pct / 100.0)
        pillar_results.append({
            "key": pillar.key,
            "name": pillar.name,
            "weight_pct": pillar.weight_pct,
            "score": round(pillar_score, 2),
            "criteria": [
                {
                    "key": c.key,
                    "name": c.name,
                    "score": criteria[c.key]["score"],
                    "justification": criteria[c.key]["justification"],
                }
                for c in pillar.criteria
            ],
        })

    return {
        "project": scores_doc["project"],
        "evaluation_target": scores_doc["evaluation_target"],
        "evaluated_by": scores_doc.get("evaluated_by", "Unattributed"),
        "evaluation_date": scores_doc.get("evaluation_date", "Unattributed"),
        "pillars": pillar_results,
        "overall_score": round(overall, 2),
        "overall_max": SCORE_MAX,
    }


def run(project: str) -> dict[str, Any]:
    validate_rubric()
    scores_doc = load_scores(project)
    validate_scores(scores_doc)
    results = compute_results(scores_doc)
    out_path = ASSESSMENTS_DIR / project / "results.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        f.write("\n")
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", help="Assessment folder name under trace_evaluation/assessments/")
    args = parser.parse_args()
    try:
        results = run(args.project)
    except (FileNotFoundError, ScoreValidationError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"TRACE overall score for {results['project']}: {results['overall_score']} / {results['overall_max']}")
    for p in results["pillars"]:
        print(f"  {p['name']:<12} {p['score']:>5.2f} / 10  (weight {p['weight_pct']:.0f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
