# Quality Check — SARMAAN LC Dashboard

_Review date: 2026-08-06_
_Reviewer: Senior Software Quality Architect_

## Executive Summary

- **Overall platform quality rating:** 8/10
- **Release recommendation:** Go
- **Key strengths:**
  - Zero-infrastructure architecture (GitHub Pages + Actions + Kobo) is well-suited to the use case; low failure surface.
  - Secrets discipline: Kobo token lives only in a GitHub Actions secret (README §Security notes:247), never written into `data.json` or the workflow log.
  - Excellent operator documentation: [README.md](README.md) covers architecture, deployment, ongoing ops, troubleshooting, and security.
  - Deterministic data pipeline: rows sorted `(date, lga)` before write for stable diffs ([fetch_data.py](fetch_data.py)).
  - Fully static frontend (Chart.js from CDN, no build step) — trivial to host and audit.
- **Critical risks:**
  - No automated tests for `fetch_data.py` or the two HTML dashboards — regressions in `clean(row)` would ship silently.
  - README §Repository layout:113 flags a real ambiguity: workflow writes `data.json` to repo root while `public/` is the Pages source — mis-configured deployments will show empty dashboards.
  - Repo must be **public** for the free Pages tier — any PII sneaking into `clean(row)` becomes world-readable (README:249).

## Findings by Area

### Frontend
- **Status:** Pass (with warnings)
- **Observations:** Two-page vanilla HTML + Chart.js dashboard ([index.html](index.html), [insights.html](insights.html)) reading from a single `data.json`. Shared behaviour extracted to [assets/dashboard.js](assets/dashboard.js) / [assets/dashboard.css](assets/dashboard.css). Filters combine (AND) with a Reset control. Header status dot surfaces fetch state (README §Freshness:53).
- **Evidence:** [README.md:26](README.md#L26) describes KPI strip, activity breakdown, geofence status; [assets/dashboard.js](assets/dashboard.js) is the extracted shared JS; [assets/dashboard.css](assets/dashboard.css) contains design tokens.
- **Risk level:** Low
- **Recommended actions:**
  1. Add a lightweight visual-regression check (Playwright screenshot diff) covering `index.html` and `insights.html` against a canned `data.json` fixture.
  2. Freeze the Chart.js CDN version and Subresource-Integrity (SRI) hash to guarantee reproducibility.

### Backend / Data Pipeline
- **Status:** Warning
- **Observations:** [fetch_data.py](fetch_data.py) is stdlib-only Python 3, paginates `assets/<uid>/data/`, normalises via `clean(row)`, drops rows without date/LGA, sorts, writes JSON. Simple and auditable.
- **Evidence:** README §Data pipeline:117 documents the flow; script name confirmed in repo root listing.
- **Risk level:** Medium
- **Recommended actions:**
  1. Add unit tests around `clean(row)` in a new `tests/test_fetch_data.py` — cover date parsing, yes/no coercion, activity-code splitting, nested repeat-group extraction, and null-LGA/null-date drop behaviour.
  2. Emit the row count and dropped-row count to stdout so the GitHub Action log doubles as a data-quality signal.

### Database
- **Status:** N/A — no database (README §Architecture:64: "No server, no database").

### APIs
- **Status:** N/A — dashboard consumes KoboToolbox API server-side only; no in-repo API surface.

### Security
- **Status:** Pass
- **Observations:** Kobo token stored only in GitHub Actions secret; `data.json` scrubbed of PII in `clean(row)`.
- **Evidence:** [README.md:245-249](README.md#L245).
- **Risk level:** Low (contingent on `clean(row)` staying honest)
- **Recommended actions:**
  1. Add a CI grep step failing the workflow if `data.json` contains obvious PII patterns (phone, national ID) before commit.
  2. Document a token-rotation cadence (README §Troubleshooting:237 covers HTTP 401 but not rotation policy).

### Performance
- **Status:** Pass
- **Observations:** Static bundle + single JSON fetch; no server-side compute at request time.
- **Evidence:** Architecture diagram [README.md:66](README.md#L66).
- **Risk level:** Low
- **Recommended actions:** Unverified — no LCP/INP/CLS measurements in repo. If dataset grows past ~50k rows, chunk `data.json` by LGA.

### DevOps
- **Status:** Warning
- **Observations:** GitHub Action runs `fetch_data.py` hourly (`0 * * * *`); commits `data.json` back to `main`; Pages serves `/public` (README §Ongoing operation:193). Real config mismatch called out at README:113 (workflow writes to root, Pages serves `/public`).
- **Evidence:** README §Configuration reference:202; README §Ongoing operation:193.
- **Risk level:** Medium
- **Recommended actions:**
  1. Resolve the root-vs-`/public` mismatch: pick one and update either the workflow or Pages source in a single PR.
  2. Add a workflow step that fails the run if `data.json` size drops by >50% vs the previous commit (guard against a Kobo API partial-failure wiping the dashboard).

### Testing
- **Status:** Fail
- **Observations:** No `tests/` directory, no `pytest`/`unittest`.
- **Evidence:** Repo top-level listing shows only `README.md`, `assets`, `data.json`, `fetch_data.py`, `index.html`, `insights.html`, `public`.
- **Risk level:** Medium
- **Recommended actions:** Add `tests/test_fetch_data.py` with fixtures for at least: normal row, missing date, missing LGA, all activity flags, nested device-issue repeat.

### Documentation
- **Status:** Pass
- **Observations:** [README.md](README.md) is exceptional — 261 lines covering architecture, deployment, ops, config, extension, troubleshooting, security, license.
- **Evidence:** Full README exists.
- **Risk level:** Low

### Monitoring & Observability
- **Status:** Warning
- **Observations:** The dashboard header shows fetch status (green/amber/red), but there is no external alerting when the GitHub Action fails.
- **Evidence:** README §Freshness:53; no Slack/email step in the workflow (workflow file not present in repo listing).
- **Risk level:** Medium
- **Recommended actions:**
  1. Add a `if: failure()` step to the workflow that posts to Slack (or opens a GitHub issue) so a broken sync doesn't silently persist for hours.

### Code Quality
- **Status:** Pass
- **Observations:** Small surface area, clear file layout, shared JS/CSS extracted.
- **Risk level:** Low

## Prioritized Action Plan

| Priority | Area | Issue | Recommendation | Effort | Impact |
|----------|------|-------|----------------|--------|--------|
| High | DevOps | Workflow-vs-Pages `data.json` location mismatch could silently break deploy | Pick one location, update in one PR | Low | High |
| High | Testing | No tests for `fetch_data.py` cleaning logic | Add `tests/test_fetch_data.py` with row fixtures | Low | High |
| High | Monitoring | No alert on failed hourly sync | Add `if: failure()` Slack/issue step in workflow | Low | Medium |
| Medium | Backend | No visibility into pipeline row/drop counts | Log kept/dropped counts to workflow output | Low | Medium |
| Medium | Security | No CI check for PII leakage into `data.json` | Add grep-based guard on phone/ID patterns pre-commit | Low | Medium |
| Low | Frontend | No visual regression tests | Add Playwright snapshot on canned fixture | Medium | Medium |
| Low | Frontend | CDN Chart.js has no SRI pin | Add integrity/version pin | Low | Low |

## Overall Quality Scorecard

| Domain | Score (/10) |
|--------|-------------|
| Frontend | 8 |
| Backend / Pipeline | 7 |
| Database | N/A |
| API Design | N/A |
| Security | 8 |
| Performance | 9 |
| DevOps | 6 |
| Testing | 3 |
| Documentation | 10 |
| Monitoring | 5 |

**Overall Score:** 8/10
**Release Decision:** Go — architecture is sound and documentation is excellent; testing/monitoring gaps are worth fixing but not release-blocking for a stateless static dashboard.

## Deployment Readiness Checklist
- [ ] Build passes — Unverified (no CI build step visible in repo listing)
- [ ] Tests pass — Fail (no tests exist)
- [ ] Security scan complete — Unverified
- [x] Database migration validated — N/A (no DB)
- [ ] Performance acceptable — Unverified (no measurements)
- [x] Rollback tested — Implicit (revert commit on `main` reverts `data.json`)
- [ ] Monitoring configured — Warning (dashboard shows fetch state but no external alert)
- [x] Documentation updated — Pass ([README.md](README.md))
- [x] Environment variables configured — Pass (documented at [README.md:170](README.md#L170))
- [x] Backup verified — Pass (every refresh is a git commit; full history in `main`)
