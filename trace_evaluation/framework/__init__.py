"""
TRACE Evaluation Framework — portable scoring engine.

This package is deliberately project-agnostic: it knows the five TRACE
pillars, their weights, and their criteria (rubric.py), and how to turn a
project's raw scores into a weighted result (scorer.py). It holds no
knowledge of any specific project being evaluated — that lives in
trace_evaluation/assessments/<project>/scores.json.

To reuse TRACE on another repository: copy the whole trace_evaluation/
directory as-is (framework/, latex/, scripts/), then add a new
assessments/<project_name>/scores.json for that project. Nothing in
framework/ or latex/ should ever need to change per project.
"""
