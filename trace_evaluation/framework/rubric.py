"""
The TRACE rubric, as data.

Source: "TRACE Evaluation Framework.docx" (eHealth Africa). TRACE evaluates
a complex intervention — an AI agent, a digital health tool, a policy, or
(as applied here) a software product — across five weighted pillars,
looking at the whole trajectory (the "how") alongside the final result
(the "what"), not a single-point metric.

This module is pure data + validation. It carries no scores and no
knowledge of any specific project — see assessments/<project>/scores.json
for that. Keep it identical across every project TRACE is run on; the
per-project delta belongs entirely in that project's scores.json.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Criterion:
    key: str          # stable id, referenced from a project's scores.json
    name: str
    description: str


@dataclass(frozen=True)
class Pillar:
    key: str
    name: str
    weight_pct: float  # must sum to 100 across all pillars
    summary: str
    criteria: tuple[Criterion, ...]


TRACE_PILLARS: tuple[Pillar, ...] = (
    Pillar(
        key="technical",
        name="Technical",
        weight_pct=20.0,
        summary=(
            "Functional, structural, and foundational robustness of the "
            "intervention."
        ),
        criteria=(
            Criterion(
                "system_performance",
                "System Performance",
                "The technical ability to navigate information, use tools, "
                "and generate accurate results.",
            ),
            Criterion(
                "evidence_grounding",
                "Evidence Grounding",
                "Outputs are supported by factual evidence — preventing "
                "hallucinated or unreliable reasoning.",
            ),
            Criterion(
                "process_efficiency",
                "Process Efficiency",
                "The ability to achieve goals with minimal, necessary "
                "actions rather than redundant, wasteful ones.",
            ),
        ),
    ),
    Pillar(
        key="realworld",
        name="Real-world",
        weight_pct=25.0,
        summary=(
            "Performance in authentic, noisy environments rather than "
            "controlled, ideal settings."
        ),
        criteria=(
            Criterion(
                "realism_robustness",
                "Realism & Robustness",
                "How well the system performs against unexpected "
                "challenges, information traps, and messy/incorrect data.",
            ),
            Criterion(
                "context_applicability",
                "Context Applicability",
                "How the tool adapts to diverse, complex organizational or "
                "social settings.",
            ),
            Criterion(
                "safety_reliability",
                "Safety & Reliability",
                "Whether, in practice, the system behaves in a safe and "
                "controllable manner.",
            ),
        ),
    ),
    Pillar(
        key="adaptive",
        name="Adaptive",
        weight_pct=20.0,
        summary="The capacity to learn, change, and improve based on feedback.",
        criteria=(
            Criterion(
                "self_correction",
                "Self-Correction",
                "Ability to recover from errors (recovery latency).",
            ),
            Criterion(
                "iterative_design",
                "Iterative Design",
                "A 'living document' approach where methodologies are "
                "updated based on ongoing monitoring.",
            ),
            Criterion(
                "feedback_loops",
                "Feedback Loops",
                "Utilizing feedback — natural language feedback or "
                "performance scores — to refine strategies dynamically.",
            ),
        ),
    ),
    Pillar(
        key="outcomes",
        name="Outcomes",
        weight_pct=25.0,
        summary=(
            "The final results, evaluating whether the intended goals "
            "were achieved effectively."
        ),
        criteria=(
            Criterion(
                "final_success",
                "Final Success",
                "The accuracy of the final answer, product, or policy "
                "outcome.",
            ),
            Criterion(
                "impact_analysis",
                "Impact Analysis",
                "The difference the intervention made — e.g. reducing "
                "cost/risk, improving productivity, changing behavior.",
            ),
            Criterion(
                "process_outcome_link",
                "Process-Outcome Link",
                "How effectively the intermediate steps (trajectory) led "
                "to the final outcome.",
            ),
        ),
    ),
    Pillar(
        key="economic",
        name="Economic",
        weight_pct=10.0,
        summary="The financial viability and efficiency of the intervention.",
        criteria=(
            Criterion(
                "cost_benefit",
                "Cost-Benefit Analysis",
                "Whether the benefits of the intervention outweigh the "
                "costs of implementation.",
            ),
            Criterion(
                "efficiency_analysis",
                "Efficiency Analysis",
                "How well resources are used (cost-effectiveness).",
            ),
            Criterion(
                "scalability",
                "Scalability",
                "Whether the solution can be scaled sustainably without "
                "prohibitive expenses.",
            ),
        ),
    ),
)

SCORE_MIN = 0.0
SCORE_MAX = 10.0


def validate_rubric() -> None:
    """Sanity-check the rubric itself — run once, at import time in tests."""
    total_weight = sum(p.weight_pct for p in TRACE_PILLARS)
    if abs(total_weight - 100.0) > 1e-9:
        raise ValueError(f"Pillar weights must sum to 100, got {total_weight}")
    seen_pillar_keys = set()
    for pillar in TRACE_PILLARS:
        if pillar.key in seen_pillar_keys:
            raise ValueError(f"Duplicate pillar key: {pillar.key}")
        seen_pillar_keys.add(pillar.key)
        if not pillar.criteria:
            raise ValueError(f"Pillar {pillar.key} has no criteria")
        seen_criterion_keys = set()
        for c in pillar.criteria:
            if c.key in seen_criterion_keys:
                raise ValueError(f"Duplicate criterion key in {pillar.key}: {c.key}")
            seen_criterion_keys.add(c.key)


def pillar_by_key(key: str) -> Pillar:
    for p in TRACE_PILLARS:
        if p.key == key:
            return p
    raise KeyError(f"Unknown pillar key: {key}")


def criterion_keys(pillar: Pillar) -> tuple[str, ...]:
    return tuple(c.key for c in pillar.criteria)
