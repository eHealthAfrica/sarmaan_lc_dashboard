"""
Builds and compiles a project's TRACE report PDF.

Portable across projects — reads only:
  trace_evaluation/assessments/<project>/results.json    (from scorer.py)
  trace_evaluation/assessments/<project>/narrative.json   (per-project prose)
plus the generic rubric in framework/rubric.py. Nothing project-specific is
hardcoded here; copy trace_evaluation/ into another repo and this script
needs no changes.

Usage (from repo root, after scorer.py and generate_figures.py have run):
    python trace_evaluation/scripts/generate_report.py <project_name>

Writes:
  trace_evaluation/assessments/<project>/report/trace_report_<project>.tex
  trace_evaluation/assessments/<project>/report/trace_report_<project>.pdf
"""

import argparse
import json
import os
import subprocess
import sys

HERE = os.path.dirname(__file__)
ASSESSMENTS_DIR = os.path.join(HERE, '..', 'assessments')

sys.path.insert(0, os.path.join(HERE, '..', '..'))
from trace_evaluation.framework.rubric import TRACE_PILLARS  # noqa: E402

LATEX_SPECIAL = {
    '\\': r'\textbackslash{}',
    '&': r'\&',
    '%': r'\%',
    '$': r'\$',
    '#': r'\#',
    '_': r'\_',
    '{': r'\{',
    '}': r'\}',
    '~': r'\textasciitilde{}',
    '^': r'\textasciicircum{}',
    '<': r'\textless{}',
    '>': r'\textgreater{}',
}


def esc(text: str) -> str:
    """Escape plain text (e.g. scores.json justifications) for LaTeX. Never
    apply this to narrative.json strings — those are hand-authored LaTeX
    already and escaping them again would double-escape \\texttt{} etc."""
    out = []
    for ch in text:
        out.append(LATEX_SPECIAL.get(ch, ch))
    return ''.join(out)


def load_json(path: str) -> dict:
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def band_word(score: float) -> str:
    if score >= 7.0:
        return 'Strong'
    if score >= 5.0:
        return 'Adequate, with gaps'
    return 'Weak'


def band_color(score: float) -> str:
    if score >= 7.0:
        return 'ehaAccent'
    if score >= 5.0:
        return 'ehaAmber'
    return 'ehaRed'


def build_preamble(nar: dict) -> str:
    # Mirrors reports/unit_test_report.tex exactly (eHA house style) —
    # same colors, same macros, same header/footer/section styling. Keep
    # this identical to that file's preamble if the house style changes.
    return r"""\documentclass[12pt, a4paper]{article}

\usepackage[margin=2.5cm, top=3cm, bottom=3cm]{geometry}
\emergencystretch=3em
\tolerance=1200
\usepackage[table]{xcolor}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{booktabs}
\usepackage{array}
\usepackage{tabularx}
\usepackage{graphicx}
\usepackage{hyperref}
\usepackage{fancyhdr}
\usepackage{titlesec}
\usepackage{parskip}
\usepackage{enumitem}
\usepackage[letterspace=150]{microtype}
\usepackage{mdframed}
\usepackage{lmodern}
\usepackage{fontenc}
\usepackage{inputenc}
\usepackage{caption}
\usepackage{subcaption}
\usepackage{float}
\usepackage{multirow}
\usepackage{longtable}
\usepackage{tcolorbox}
\tcbuselibrary{skins, breakable}

\definecolor{ehaBlue}{RGB}{0, 84, 142}
\definecolor{ehaLightBlue}{RGB}{224, 237, 248}
\definecolor{ehaGrey}{RGB}{245, 245, 245}
\definecolor{ehaAccent}{RGB}{0, 153, 118}
\definecolor{ehaRed}{RGB}{192, 57, 43}
\definecolor{ehaAmber}{RGB}{230, 126, 34}
\definecolor{tableHead}{RGB}{0, 84, 142}
\definecolor{tableAlt}{RGB}{240, 248, 255}
\definecolor{resolvedGreen}{RGB}{39, 174, 96}

\hypersetup{
  colorlinks=true, linkcolor=ehaBlue, urlcolor=ehaBlue,
  pdftitle={""" + nar['pdf_title'] + r"""},
  pdfauthor={""" + nar['pdf_author'] + r"""},
}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textcolor{ehaBlue}{\textbf{""" + nar['header_left'] + r"""}}}
\fancyhead[R]{\small\textcolor{gray}{""" + nar['date_line'] + r"""}}
\fancyfoot[C]{\small\textcolor{gray}{\thepage}}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\headrule}{\hbox to\headwidth{\color{ehaBlue}\leaders\hrule height\headrulewidth\hfill}}
\setlength{\headheight}{25.4pt}

\titleformat{\section}{\large\bfseries\color{ehaBlue}}{\thesection.}{0.6em}{}[\titlerule]
\titleformat{\subsection}{\normalsize\bfseries\color{ehaBlue!80!black}}{\thesubsection}{0.6em}{}
\titleformat{\subsubsection}{\small\bfseries\color{ehaBlue!60!black}}{\thesubsubsection}{0.6em}{}
\titlespacing*{\section}{0pt}{1.6em}{0.7em}
\titlespacing*{\subsection}{0pt}{1.1em}{0.4em}
\titlespacing*{\subsubsection}{0pt}{0.9em}{0.3em}

\mdfdefinestyle{keybox}{
  backgroundcolor=ehaLightBlue, linecolor=ehaBlue, linewidth=1pt,
  innerleftmargin=12pt, innerrightmargin=12pt,
  innertopmargin=10pt, innerbottommargin=10pt, roundcorner=4pt,
}
\mdfdefinestyle{warnbox}{
  backgroundcolor=ehaAmber!12, linecolor=ehaAmber, linewidth=1.5pt,
  topline=false, rightline=false, bottomline=false,
  innerleftmargin=12pt, innerrightmargin=12pt,
  innertopmargin=8pt, innerbottommargin=8pt,
}
\mdfdefinestyle{alertbox}{
  backgroundcolor=ehaRed!8, linecolor=ehaRed, linewidth=1.5pt,
  topline=false, rightline=false, bottomline=false,
  innerleftmargin=12pt, innerrightmargin=12pt,
  innertopmargin=8pt, innerbottommargin=8pt,
}
\mdfdefinestyle{greenbox}{
  backgroundcolor=ehaAccent!10, linecolor=ehaAccent, linewidth=1.5pt,
  topline=false, rightline=false, bottomline=false,
  innerleftmargin=12pt, innerrightmargin=12pt,
  innertopmargin=8pt, innerbottommargin=8pt,
}
\mdfdefinestyle{mitigbox}{
  backgroundcolor=ehaBlue!6, linecolor=ehaBlue, linewidth=1.5pt,
  topline=false, rightline=false, bottomline=false,
  innerleftmargin=12pt, innerrightmargin=12pt,
  innertopmargin=8pt, innerbottommargin=8pt,
}

\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\newcolumntype{C}[1]{>{\centering\arraybackslash}p{#1}}
\newcolumntype{R}[1]{>{\raggedleft\arraybackslash}p{#1}}

\captionsetup{font=small, labelfont={bf,color=ehaBlue}, labelsep=period,
              skip=6pt, width=0.95\textwidth}

\newcounter{finding}
\newcommand{\finding}[1]{%
  \stepcounter{finding}%
  \begin{mdframed}[style=greenbox]
  \textbf{Finding \thefinding:} #1
  \end{mdframed}%
}
\newcounter{issue}
\newcommand{\issuelabel}[2]{%
  \stepcounter{issue}%
  \begin{mdframed}[style=alertbox]
  \textbf{Issue \theissue\ [\textcolor{ehaRed}{#1}]:} #2
  \end{mdframed}%
}
\newcommand{\mitigation}[1]{%
  \begin{mdframed}[style=mitigbox]
  \textbf{\textcolor{ehaBlue}{Mitigation:}} #1
  \end{mdframed}%
}

\begin{document}
"""


def build_titlepage(nar: dict, results: dict) -> str:
    overall = results['overall_score']
    return r"""
% ════════════════════════════════════════════════════════════════════════════════
%  TITLE PAGE
% ════════════════════════════════════════════════════════════════════════════════
\begin{titlepage}
  \pagecolor{ehaBlue}\color{white}
  \vspace*{1.8cm}

  {\fontsize{10}{12}\selectfont\MakeUppercase{\textls[100]{TRACE Evaluation Report}}}\\[0.5em]
  {\fontsize{26}{32}\selectfont\bfseries """ + nar['doc_title_line1'] + r"""\\[0.3em]
   """ + nar['doc_title_line2'] + r"""}\\[1.2em]
  \textcolor{ehaAccent}{\rule{6cm}{2pt}}\\[1.2em]

  {\large """ + nar['subject_line'] + r"""}\\[0.4em]
  {\normalsize """ + nar['org_line'] + r"""}\\[2.5cm]

  \begin{tabular}{@{}ll}
    \textbf{Document Version}  & """ + nar['doc_version'] + r""" \\[0.4em]
    \textbf{Date}              & """ + nar['date_line'] + r""" \\[0.4em]
    \textbf{Repository}        & """ + nar['repository'] + r""" \\[0.4em]
    \textbf{Branch}            & \texttt{""" + esc(nar['branch']) + r"""} \\[0.4em]
    \textbf{Commit Evaluated}  & \texttt{""" + esc(nar['commit']) + r"""} \\[0.4em]
    \textbf{Framework}         & TRACE (Technical / Real-world / Adaptive / Outcomes / Economic) \\[0.4em]
    \textbf{Evaluated By}      & """ + esc(results['evaluated_by']) + r""" \\[0.4em]
    \textbf{Overall Score}     & \textbf{""" + f"{overall:.2f}" + r""" / 10} \\[0.4em]
    \textbf{Status}            & """ + nar['status'] + r""" \\
  \end{tabular}

  \vfill
  {\small\textcolor{white!70!ehaBlue}
    {This report documents the design, scope, and results of a TRACE
     evaluation of """ + esc(results['evaluation_target']) + r""". It
     records what was scored, on what evidence, what was found, and what
     remains open for follow-up.}}
\end{titlepage}
\pagecolor{white}\color{black}

% ════════════════════════════════════════════════════════════════════════════════
%  TABLE OF CONTENTS
% ════════════════════════════════════════════════════════════════════════════════
\tableofcontents
\clearpage
"""


def build_executive_summary(nar: dict, results: dict) -> str:
    intro = '\n\n'.join(nar['executive_summary_intro'])
    glance_items = '\n'.join(f"  \\item {line}" for line in nar['key_at_a_glance'])
    return r"""
% ════════════════════════════════════════════════════════════════════════════════
%  1. EXECUTIVE SUMMARY
% ════════════════════════════════════════════════════════════════════════════════
\section{Executive Summary}

""" + intro + r"""

\begin{mdframed}[style=keybox]
\textbf{Key Numbers at a Glance}
\begin{itemize}[noitemsep, topsep=2pt]
""" + glance_items + r"""
\end{itemize}
\end{mdframed}

\clearpage
"""


def build_methodology() -> str:
    rows = '\n'.join(
        f"{p.name} & {p.weight_pct:.0f}\\% & {esc(p.summary)} \\\\"
        for p in TRACE_PILLARS
    )
    crit_blocks = []
    for p in TRACE_PILLARS:
        items = '\n'.join(
            f"  \\item \\textbf{{{esc(c.name)}}} --- {esc(c.description)}"
            for c in p.criteria
        )
        crit_blocks.append(
            f"\\subsection{{{p.name} ({p.weight_pct:.0f}\\%)}}\n"
            f"{esc(p.summary)}\n"
            f"\\begin{{itemize}}[noitemsep]\n{items}\n\\end{{itemize}}"
        )
    crit_section = '\n\n'.join(crit_blocks)

    return r"""
% ════════════════════════════════════════════════════════════════════════════════
%  2. FRAMEWORK AND METHODOLOGY
% ════════════════════════════════════════════════════════════════════════════════
\section{Framework and Methodology}

TRACE evaluates an intervention across five weighted pillars. Each pillar
is scored as the mean of its own criteria (each criterion scored 0--10
against cited evidence); the overall score is the weight-weighted mean of
the five pillar scores, also on a 0--10 scale. A criterion score without a
written justification is rejected by the scoring tool --- every number in
this report traces back to a specific, citable piece of evidence.

\begin{table}[H]
\centering
\caption{TRACE pillars and weights}
\label{tab:pillars}
\small
\rowcolors{2}{tableAlt}{white}
\begin{tabularx}{\linewidth}{L{2.6cm} C{1.6cm} X}
\toprule
\rowcolor{tableHead}
\textcolor{white}{\textbf{Pillar}} &
\textcolor{white}{\textbf{Weight}} &
\textcolor{white}{\textbf{What it measures}} \\
\midrule
""" + rows + r"""
\bottomrule
\end{tabularx}
\end{table}

\begin{mdframed}[style=mitigbox]
\textbf{Scoring scale:} 0--10 per criterion. \textbf{$\geq$7.0}: strong,
evidenced, no material gap. \textbf{5.0--6.9}: adequate, with a specific,
named gap. \textbf{$<$5.0}: weak --- an open risk or unmeasured area that
should be treated as a priority action.
\end{mdframed}

\subsection*{Criteria by Pillar}

""" + crit_section + r"""

\clearpage
"""


def build_results(results: dict, project: str) -> str:
    overall = results['overall_score']
    scorecard_rows = '\n'.join(
        f"{p['name']} & {p['weight_pct']:.0f}\\% & {p['score']:.2f} & "
        f"\\textcolor{{{band_color(p['score'])}}}{{\\textbf{{{esc(band_word(p['score']))}}}}} \\\\"
        for p in results['pillars']
    )

    detail_blocks = []
    for p in results['pillars']:
        crit_items = []
        for c in p['criteria']:
            crit_items.append(
                r"\begin{mdframed}[style=" + (
                    'greenbox' if c['score'] >= 7.0 else 'warnbox' if c['score'] >= 5.0 else 'alertbox'
                ) + r"]\textbf{" + esc(c['name']) + f" --- {c['score']:.1f} / 10}}\\\\\n"
                + esc(c['justification']) + r"\end{mdframed}"
            )
        detail_blocks.append(
            f"\\subsection{{{p['name']} --- {p['score']:.2f} / 10}}\n" + '\n'.join(crit_items)
        )
    detail_section = '\n\n'.join(detail_blocks)

    fig_dir = f"figures"
    return r"""
% ════════════════════════════════════════════════════════════════════════════════
%  3. RESULTS
% ════════════════════════════════════════════════════════════════════════════════
\section{Results}

\subsection{Scorecard}

\begin{table}[H]
\centering
\caption{TRACE pillar scorecard}
\label{tab:scorecard}
\small
\rowcolors{2}{tableAlt}{white}
\begin{tabularx}{\linewidth}{X C{1.6cm} C{1.6cm} C{3.4cm}}
\toprule
\rowcolor{tableHead}
\textcolor{white}{\textbf{Pillar}} &
\textcolor{white}{\textbf{Weight}} &
\textcolor{white}{\textbf{Score}} &
\textcolor{white}{\textbf{Rating}} \\
\midrule
""" + scorecard_rows + r"""
\midrule
\multicolumn{2}{r}{\textbf{Overall (weighted)}} & \textbf{""" + f"{overall:.2f}" + r"""} &
  \textcolor{""" + band_color(overall) + r"""}{\textbf{""" + esc(band_word(overall)) + r"""}} \\
\bottomrule
\end{tabularx}
\end{table}

\begin{figure}[H]
  \centering
  \includegraphics[width=0.92\textwidth]{""" + fig_dir + r"""/fig01_pillar_scorecard.pdf}
  \caption{Weighted score per pillar against the overall score (dashed line).}
  \label{fig:pillar_scorecard}
\end{figure}

\begin{figure}[H]
  \centering
  \includegraphics[width=0.95\textwidth]{""" + fig_dir + r"""/fig02_criterion_detail.pdf}
  \caption{All 15 individual criterion scores, color-banded by rating.}
  \label{fig:criterion_detail}
\end{figure}

\clearpage

\subsection{Criterion-Level Detail}

Each box below states the criterion's score and the specific evidence it
is grounded in. Colour follows the same scale as Table~\ref{tab:scorecard}
(green $\geq$7.0, amber 5.0--6.9, red $<$5.0).

""" + detail_section + r"""

\clearpage
"""


def build_findings(nar: dict) -> str:
    finding_blocks = '\n'.join(
        r"\finding{" + f['text'] + "}" for f in nar['findings']
    )
    issue_blocks = []
    for i in nar['issues']:
        issue_blocks.append(
            r"\issuelabel{" + i['label'] + "}{" + i['text'] + "}\n"
            r"\mitigation{" + i['mitigation'] + "}"
        )
    issues_section = '\n\n'.join(issue_blocks)

    return r"""
% ════════════════════════════════════════════════════════════════════════════════
%  4. KEY FINDINGS AND INTERPRETATION
% ════════════════════════════════════════════════════════════════════════════════
\section{Key Findings and Interpretation}

\subsection{Strengths}

""" + finding_blocks + r"""

\subsection{Open Issues}

""" + issues_section + r"""

\clearpage
"""


def build_limitations(nar: dict) -> str:
    items = '\n'.join(f"  \\item {line}" for line in nar['limitations'])
    return r"""
% ════════════════════════════════════════════════════════════════════════════════
%  5. LIMITATIONS OF THIS EVALUATION
% ════════════════════════════════════════════════════════════════════════════════
\section{Limitations of This Evaluation}

\begin{enumerate}[itemsep=4pt]
""" + items + r"""
\end{enumerate}

\clearpage
"""


def build_reproducibility(nar: dict) -> str:
    r = nar['reproducibility']
    return r"""
% ════════════════════════════════════════════════════════════════════════════════
%  6. REPRODUCIBILITY
% ════════════════════════════════════════════════════════════════════════════════
\section{Reproducibility}

\begin{mdframed}[style=mitigbox]
\textbf{Framework:} \texttt{""" + r['framework_path'] + r"""}\\
\textbf{Scores file:} \texttt{""" + r['scores_file'] + r"""}\\
\textbf{Score command:} \texttt{""" + r['scorer_cmd'] + r"""}\\
\textbf{Figures command:} \texttt{""" + r['figures_cmd'] + r"""}\\
\textbf{Report command:} \texttt{""" + r['report_cmd'] + r"""}
\end{mdframed}

""" + r['note'] + r"""

\end{document}
"""


def compile_pdf(tex_path: str) -> None:
    report_dir = os.path.dirname(tex_path)
    tex_name = os.path.basename(tex_path)
    for _ in range(2):  # twice, so the table of contents resolves
        result = subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', tex_name],
            cwd=report_dir, capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(result.stdout[-4000:])
            print(result.stderr[-2000:])
            raise RuntimeError(f"pdflatex failed compiling {tex_path}")
    print(f"compiled {tex_path.replace('.tex', '.pdf')}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project')
    parser.add_argument('--no-compile', action='store_true',
                         help="Write the .tex but skip invoking pdflatex.")
    args = parser.parse_args()

    project_dir = os.path.join(ASSESSMENTS_DIR, args.project)
    results = load_json(os.path.join(project_dir, 'results.json'))
    nar = load_json(os.path.join(project_dir, 'narrative.json'))

    tex = (
        build_preamble(nar)
        + build_titlepage(nar, results)
        + build_executive_summary(nar, results)
        + build_methodology()
        + build_results(results, args.project)
        + build_findings(nar)
        + build_limitations(nar)
        + build_reproducibility(nar)
    )

    report_dir = os.path.join(project_dir, 'report')
    os.makedirs(report_dir, exist_ok=True)
    tex_path = os.path.join(report_dir, f'trace_report_{args.project}.tex')
    with open(tex_path, 'w', encoding='utf-8') as f:
        f.write(tex)
    print(f"wrote {tex_path}")

    if not args.no_compile:
        compile_pdf(tex_path)
    return 0


if __name__ == '__main__':
    sys.exit(main())
