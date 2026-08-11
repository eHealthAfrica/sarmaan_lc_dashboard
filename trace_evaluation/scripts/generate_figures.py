"""
Generates every figure embedded in a project's TRACE report.

Portable across projects — reads only trace_evaluation/assessments/<project>/
results.json (produced by framework/scorer.py), never project-specific
numbers hardcoded in this file. Copy trace_evaluation/ into another repo and
this script needs no changes; only that project's scores.json does.

Usage (from repo root):
    python trace_evaluation/scripts/generate_figures.py <project_name>

Writes PDFs to trace_evaluation/assessments/<project>/report/figures/.
"""

import argparse
import json
import os
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# eHA report palette — matches reports/unit_test_report.tex and every other
# eHA LaTeX report (NCDC/docs/*.tex). Keep identical to those.
EHA_BLUE = '#00548E'
EHA_LIGHT_BLUE = '#E0EDF8'
EHA_ACCENT = '#009976'
EHA_RED = '#C0392B'
EHA_AMBER = '#E67E22'
EHA_GREY = '#6B6B6B'

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 10,
    'axes.edgecolor': '#CCCCCC',
    'axes.linewidth': 0.8,
    'figure.facecolor': 'white',
    'savefig.facecolor': 'white',
})

HERE = os.path.dirname(__file__)
ASSESSMENTS_DIR = os.path.join(HERE, '..', 'assessments')


def _band_color(score: float) -> str:
    """0-10 score -> traffic-light color, consistent with the report's
    pass/warn/fail language (>=7 good, >=5 warning, else critical)."""
    if score >= 7.0:
        return EHA_ACCENT
    if score >= 5.0:
        return EHA_AMBER
    return EHA_RED


def load_results(project: str) -> dict:
    path = os.path.join(ASSESSMENTS_DIR, project, 'results.json')
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"No results.json for '{project}' at {path} — run "
            f"`python -m trace_evaluation.framework.scorer {project}` first."
        )
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def out_dir(project: str) -> str:
    d = os.path.join(ASSESSMENTS_DIR, project, 'report', 'figures')
    os.makedirs(d, exist_ok=True)
    return d


def save(fig, path):
    fig.savefig(path, bbox_inches='tight')
    plt.close(fig)
    print(f"wrote {path}")


# ── Figure 1: Pillar scorecard — weighted score per pillar vs. overall ─────
def fig_pillar_scorecard(results: dict, path: str):
    pillars = results['pillars']
    names = [f"{p['name']}\n(weight {p['weight_pct']:.0f}%)" for p in pillars]
    scores = [p['score'] for p in pillars]
    colors = [_band_color(s) for s in scores]

    fig, ax = plt.subplots(figsize=(6.6, 3.4))
    bars = ax.barh(names, scores, color=colors, height=0.58)
    for bar, v in zip(bars, scores):
        ax.text(v + 0.15, bar.get_y() + bar.get_height() / 2, f"{v:.2f}",
                 va='center', fontsize=9.5, color='#222222')
    ax.axvline(results['overall_score'], color=EHA_BLUE, linestyle='--', linewidth=1.3)
    ax.annotate(f"Overall {results['overall_score']:.2f}",
                xy=(results['overall_score'], 1.0), xycoords=('data', 'axes fraction'),
                xytext=(0, 4), textcoords='offset points',
                color=EHA_BLUE, fontsize=8.5, ha='center', va='bottom', weight='bold',
                clip_on=False)
    ax.set_xlim(0, 10.6)
    ax.set_xlabel('Score (0-10)')
    ax.spines[['top', 'right']].set_visible(False)
    ax.set_title(f"TRACE Pillar Scores — {results['project']}",
                 fontsize=11, color=EHA_BLUE, weight='bold', loc='left')
    save(fig, path)


# ── Figure 2: Criterion-level detail across all 15 criteria ────────────────
def fig_criterion_detail(results: dict, path: str):
    rows = []
    for pillar in results['pillars']:
        for c in pillar['criteria']:
            rows.append((f"{pillar['name']}: {c['name']}", c['score']))
    rows = list(reversed(rows))
    names = [n for n, _ in rows]
    scores = [s for _, s in rows]
    colors = [_band_color(s) for s in scores]

    fig, ax = plt.subplots(figsize=(6.8, 5.6))
    bars = ax.barh(names, scores, color=colors, height=0.62)
    for bar, v in zip(bars, scores):
        ax.text(v + 0.15, bar.get_y() + bar.get_height() / 2, f"{v:.1f}",
                 va='center', fontsize=8, color='#222222')
    ax.set_xlim(0, 10.8)
    ax.set_xlabel('Score (0-10)')
    ax.tick_params(axis='y', labelsize=7.8)
    ax.spines[['top', 'right']].set_visible(False)
    ax.set_title('All 15 Criteria', fontsize=11, color=EHA_BLUE, weight='bold', loc='left')
    handles = [
        plt.Rectangle((0, 0), 1, 1, color=EHA_ACCENT, label='>= 7.0'),
        plt.Rectangle((0, 0), 1, 1, color=EHA_AMBER, label='5.0-6.9'),
        plt.Rectangle((0, 0), 1, 1, color=EHA_RED, label='< 5.0'),
    ]
    ax.legend(handles=handles, loc='lower right', frameon=False, fontsize=8)
    save(fig, path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project')
    args = parser.parse_args()
    results = load_results(args.project)
    d = out_dir(args.project)
    fig_pillar_scorecard(results, os.path.join(d, 'fig01_pillar_scorecard.pdf'))
    fig_criterion_detail(results, os.path.join(d, 'fig02_criterion_detail.pdf'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
