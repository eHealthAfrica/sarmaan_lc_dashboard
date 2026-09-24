import { buildLGAStats, computeKPIs, ACTIVITY_MAP } from './dataUtils'

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function cap(s) { return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '' }
function pct(a, b) { return b ? Math.round(a / b * 100) : 0 }
function avg(arr, key) { return arr.length ? arr.reduce((a, r) => a + (r[key] || 0), 0) / arr.length : 0 }
function compare(val, stateAvg) {
  if (stateAvg === 0) return 'N/A'
  const diff = Math.round((val - stateAvg) / stateAvg * 100)
  return diff >= 0 ? `+${diff}% above state avg` : `${diff}% below state avg`
}
function rankLabel(rank, total) {
  if (rank <= 5) return `Top 5 (${rank} of ${total})`
  if (rank >= total - 4) return `Bottom 5 (${rank} of ${total})`
  return `${rank} of ${total}`
}
function truncate(s, n) {
  if (!s) return ''
  const str = String(s).trim()
  return str.length > n ? str.slice(0, n - 1).trimEnd() + '…' : str
}

// ─── POWERPOINT ─────────────────────────────────────────────────────────────
export async function generatePPTXReport({ lga, data, raw, dateRange, activeState, lgaCount }) {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9' // 10in x 5.63in
  pptx.author = 'SARMAAN LC Dashboard'
  pptx.company = 'eHealth Africa'
  pptx.title = 'SARMAAN LGA Coordinator Field Activity Report'

  const BRAND = '155C3A'
  const DARK  = '1A1A18'
  const GRAY  = '646E78'
  const LGRAY = 'E2E8F0'
  const RED   = 'C82828'
  const AMBER = 'B4640A'
  const GREEN = '155C3A'
  const FONT  = 'Arial'

  const stateName  = activeState?.name || 'Kano State'
  const programme  = activeState?.shortLabel ? `${activeState.shortLabel} Programme` : 'Kano AMR Programme'
  const totalLGAs  = lgaCount ?? activeState?.totalLGAs ?? new Set(raw.map(r => r.lga)).size

  const lgaData   = lga === 'all' ? data : data.filter(r => r.lga === lga)
  const allStats  = buildLGAStats(raw)
  const lgaStats  = buildLGAStats(lgaData)
  const stateKPIs = computeKPIs(data)
  const lgaStat   = lgaStats.find(s => s.lga === lga) || null
  const allSorted = [...allStats].sort((a, b) => b.n - a.n)
  const period     = dateRange?.start ? `${dateRange.start} to ${dateRange.end}` : 'Full data collection period'
  const scopeLabel = lga === 'all' ? `${stateName} — All ${totalLGAs} LGAs` : `${lga} LGA`

  const W = 10, H = 5.63

  // ── layout helpers ──
  function addHeader(slide, title) {
    slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.62, fill: { color: BRAND }, line: { type: 'none' } })
    slide.addText(title, { x: 0.35, y: 0, w: W - 0.7, h: 0.62, fontSize: 16, bold: true, color: 'FFFFFF', valign: 'middle', fontFace: FONT })
  }
  function addFooter(slide) {
    slide.addText(`SARMAAN LC Dashboard · eHealth Africa · ${formatDate()}`, { x: 0.35, y: H - 0.32, w: 6, h: 0.28, fontSize: 8, color: GRAY, fontFace: FONT })
    slide.addText(`${scopeLabel} · ${period}`, { x: W - 5.35, y: H - 0.32, w: 5, h: 0.28, fontSize: 8, color: GRAY, align: 'right', fontFace: FONT })
  }
  function newSlide(title) {
    const slide = pptx.addSlide()
    addHeader(slide, title)
    return slide
  }
  function statTile(slide, x, y, w, h, label, value, note, color = BRAND) {
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: LGRAY, width: 0.75 } })
    slide.addShape(pptx.shapes.RECTANGLE, { x, y, w, h: 0.05, fill: { color }, line: { type: 'none' } })
    slide.addText(label, { x: x + 0.12, y: y + 0.13, w: w - 0.24, h: 0.32, fontSize: 8.5, bold: true, color: GRAY, fontFace: FONT })
    slide.addText(String(value), { x: x + 0.12, y: y + 0.42, w: w - 0.24, h: 0.46, fontSize: 20, bold: true, color, fontFace: FONT })
    if (note) slide.addText(note, { x: x + 0.12, y: y + h - 0.32, w: w - 0.24, h: 0.28, fontSize: 7, color: GRAY, fontFace: FONT })
  }
  function tileGrid(slide, tiles, startY = 0.85, cols = 4) {
    const gap = 0.15
    const tw = (W - 0.35 * 2 - gap * (cols - 1)) / cols
    const th = 1.15
    tiles.forEach((t, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      statTile(slide, 0.35 + col * (tw + gap), startY + row * (th + gap), tw, th, t.label, t.value, t.note, t.color)
    })
  }
  function bulletsSlide(title, bullets, intro) {
    const slide = newSlide(title)
    let y = 0.78
    if (intro) {
      slide.addText(intro, { x: 0.4, y, w: W - 0.8, h: 0.35, fontSize: 10, color: GRAY, fontFace: FONT })
      y += 0.42
    }
    slide.addText(
      bullets.map(b => ({ text: b.text, options: { bullet: { code: '2022' }, color: b.color || DARK, breakLine: true, fontSize: 11, paraSpaceAfter: 8 } })),
      { x: 0.4, y, w: W - 0.8, h: H - y - 0.35, fontFace: FONT, valign: 'top' }
    )
    addFooter(slide)
    return slide
  }
  function tableSlide(title, header, rows, intro, colW) {
    const slide = newSlide(title)
    let y = 0.78
    if (intro) {
      slide.addText(intro, { x: 0.4, y, w: W - 0.8, h: 0.35, fontSize: 10, color: GRAY, fontFace: FONT })
      y += 0.45
    }
    const tRows = [
      header.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: BRAND }, fontSize: 10 } })),
      ...rows.map(r => r.map(c => ({
        text: String((c && typeof c === 'object') ? c.text : c),
        options: { fontSize: 10, color: (c && c.color) || DARK, fontFace: FONT },
      }))),
    ]
    slide.addTable(tRows, { x: 0.4, y, w: W - 0.8, colW, fontFace: FONT, border: { type: 'solid', color: LGRAY, pt: 0.5 }, autoPage: false })
    addFooter(slide)
    return slide
  }

  // ── SLIDE 1 — COVER ──
  const cover = pptx.addSlide()
  cover.background = { color: BRAND }
  cover.addText('SARMAAN PROJECT', { x: 0, y: 1.5, w: W, h: 0.6, align: 'center', fontSize: 32, bold: true, color: 'FFFFFF', fontFace: FONT })
  cover.addText('LGA Coordinator Field Activity Report', { x: 0, y: 2.15, w: W, h: 0.4, align: 'center', fontSize: 16, color: 'FFFFFF', fontFace: FONT })
  cover.addText(scopeLabel, { x: 0, y: 2.65, w: W, h: 0.4, align: 'center', fontSize: 14, bold: true, color: 'A7F3D0', fontFace: FONT })
  cover.addText(`Reporting period: ${period}`, { x: 0, y: 3.15, w: W, h: 0.3, align: 'center', fontSize: 10, color: '86C8A8', fontFace: FONT })
  cover.addText(`Generated: ${formatDate()}  ·  ${stateName}, Nigeria  ·  ${programme}`, { x: 0, y: 3.45, w: W, h: 0.3, align: 'center', fontSize: 10, color: '86C8A8', fontFace: FONT })

  if (lga === 'all' || !lgaStat) {
    // ── SLIDE 2 — STATE SNAPSHOT (state-wide report only) ──
    const s2 = newSlide(`${stateName} Snapshot`)
    s2.addText(`Overall performance across all ${totalLGAs} LGA Coordinators · ${period}`, { x: 0.35, y: 0.72, w: W - 0.7, h: 0.3, fontSize: 10, color: GRAY, fontFace: FONT })
    tileGrid(s2, [
      { label: 'TOTAL REPORTS', value: stateKPIs.total.toLocaleString(), note: `across ${new Set(data.map(r => r.date)).size} days` },
      { label: 'ACTIVE LGAs', value: `${stateKPIs.activeLGAs} / ${totalLGAs}`, note: `${totalLGAs - stateKPIs.activeLGAs} with zero submissions`, color: stateKPIs.activeLGAs < totalLGAs ? AMBER : GREEN },
      { label: 'INSIDE-LGA RATE', value: `${stateKPIs.insidePct}%`, note: `${stateKPIs.inside} of ${stateKPIs.total} reports` },
      { label: 'FORMS COMPLETED', value: stateKPIs.formsCompleted.toLocaleString(), note: '' },
      { label: 'WARDS COVERED', value: stateKPIs.wards.toLocaleString(), note: `avg ${avg(allStats, 'wards').toFixed(1)}/LGA` },
      { label: 'SETTLEMENTS', value: stateKPIs.settlements.toLocaleString(), note: `avg ${avg(allStats, 'sett').toFixed(1)}/LGA` },
      { label: 'HOUSEHOLDS', value: stateKPIs.hh.toLocaleString(), note: `avg ${Math.round(avg(allStats, 'hh'))}/LGA` },
      { label: 'DC ASSIGNMENTS', value: stateKPIs.dcsPresent.toLocaleString(), note: `avg ${avg(allStats, 'dcs').toFixed(1)}/LGA` },
    ], 1.05, 4)
    addFooter(s2)

    // ── SLIDE 3 — ISSUES SUMMARY (state) ──
    const s3 = newSlide('Issues Summary — State-wide')
    s3.addText(`Count of submissions flagging each issue type · ${period}`, { x: 0.35, y: 0.72, w: W - 0.7, h: 0.3, fontSize: 10, color: GRAY, fontFace: FONT })
    tileGrid(s3, [
      { label: 'OPERATIONAL CHALLENGES', value: stateKPIs.challenges, note: `${pct(stateKPIs.challenges, stateKPIs.total)}% of submissions`, color: stateKPIs.challenges > 0 ? AMBER : GREEN },
      { label: 'CRITICAL ISSUES ESCALATED', value: stateKPIs.critical, note: 'requiring state team attention', color: stateKPIs.critical > 0 ? RED : GREEN },
      { label: 'DEVICE / TECHNICAL ISSUES', value: stateKPIs.device, note: '', color: stateKPIs.device > 0 ? AMBER : GREEN },
      { label: 'SECURITY / ACCESS INCIDENTS', value: stateKPIs.security, note: '', color: stateKPIs.security > 0 ? RED : GREEN },
    ], 1.05, 4)
    addFooter(s3)

    // ── SLIDES 4-5 — TOP / BOTTOM 5 ──
    tableSlide('Top 5 LGAs — Submission Count',
      ['Rank', 'LGA', 'Submissions', 'Inside LGA %', 'Households'],
      allSorted.slice(0, 5).map((s, i) => [`${i + 1}`, s.lga, `${s.n}`, `${pct(s.inside, s.n)}%`, s.hh.toLocaleString()]),
      'LGAs with the most daily reports submitted during the reporting period.',
      [0.7, 2.5, 1.8, 1.8, 2.4])

    tableSlide('Bottom 5 LGAs — Submission Count',
      ['Rank', 'LGA', 'Submissions', 'Inside LGA %', 'Note'],
      allSorted.slice(-5).reverse().map((s, i) => [
        `${allSorted.length - i}`, s.lga, `${s.n}`, `${pct(s.inside, s.n)}%`,
        { text: s.hh === 0 ? 'No HH data recorded' : '', color: s.hh === 0 ? AMBER : DARK },
      ]),
      'LGAs with the fewest reports — may indicate reporting gaps requiring follow-up.',
      [0.7, 2.5, 1.8, 1.8, 2.4])

    // ── STATE-WIDE FLAGS & RECOMMENDATIONS ──
    const zeroSub      = totalLGAs - stateKPIs.activeLGAs
    const activeOnly   = allStats.filter(s => s.n > 0)
    const lowInside    = activeOnly.filter(s => pct(s.inside, s.n) < 50).sort((a, b) => pct(a.inside, a.n) - pct(b.inside, b.n))
    const zeroCoverage = activeOnly.filter(s => s.hh === 0 && s.wards === 0)

    const flags = []
    if (zeroSub > 0) flags.push({ text: `${zeroSub} LGA${zeroSub > 1 ? 's have' : ' has'} zero submissions during this period — confirm coordinator deployment status.`, color: RED })
    if (lowInside.length) flags.push({ text: `${lowInside.length} LGA${lowInside.length > 1 ? 's are' : ' is'} below 50% inside-LGA rate: ${lowInside.slice(0, 6).map(s => s.lga).join(', ')}${lowInside.length > 6 ? `, +${lowInside.length - 6} more` : ''}.`, color: AMBER })
    if (zeroCoverage.length) flags.push({ text: `${zeroCoverage.length} active LGA${zeroCoverage.length > 1 ? 's have' : ' has'} zero ward/household data recorded — likely a form-navigation issue (coordinator not selecting "Field Coordination & Implementation"), not necessarily inactivity: ${zeroCoverage.slice(0, 6).map(s => s.lga).join(', ')}${zeroCoverage.length > 6 ? `, +${zeroCoverage.length - 6} more` : ''}.`, color: AMBER })
    if (stateKPIs.critical > 0) flags.push({ text: `${stateKPIs.critical} critical issue${stateKPIs.critical > 1 ? 's' : ''} escalated statewide — confirm each has been received and actioned by the state team.`, color: RED })
    if (flags.length === 0) flags.push({ text: 'No major data-quality or performance flags detected across the state for this period.', color: GREEN })

    bulletsSlide('State-wide Flags & Recommendations', flags,
      'Generated from the current dataset. Review alongside the dashboard for full LGA-level detail.')

    pptx.writeFile({ fileName: `SARMAAN_${stateName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().slice(0, 10)}.pptx` })
    return
  }

  // ── Derived metrics (LGA-specific) ──
  const lgaInPct       = pct(lgaStat.inside, lgaStat.n)
  const lgaHHRank      = [...allStats].sort((a, b) => b.hh - a.hh).findIndex(s => s.lga === lga) + 1
  const lgaSubRank     = allSorted.findIndex(s => s.lga === lga) + 1
  const activeStats    = allStats.filter(s => s.n > 0)
  const lgaInsideRank  = [...activeStats].sort((a, b) => pct(b.inside, b.n) - pct(a.inside, a.n)).findIndex(s => s.lga === lga) + 1
  const stateAvgHH     = avg(activeStats, 'hh')
  const stateAvgSett   = avg(activeStats, 'sett')
  const stateAvgWards  = avg(activeStats, 'wards')
  const stateAvgDCS    = avg(activeStats, 'dcs')
  const stateAvgForms  = avg(activeStats, 'forms')
  const stateAvgInPct  = pct(stateKPIs.inside, stateKPIs.total)
  const days           = [...lgaStat.days].sort()
  const totalExpected  = lgaStat.dcs + lgaStat.dcs_partial + lgaStat.dcs_absent
  const dcAttendRate   = pct(lgaStat.dcs, totalExpected)
  const formPerDC      = lgaStat.dcs > 0 ? (lgaStat.forms / lgaStat.dcs).toFixed(1) : 'N/A'
  const stateFormPerDC = stateAvgDCS > 0 ? (stateAvgForms / stateAvgDCS).toFixed(1) : 'N/A'
  const hhPerWard      = lgaStat.wards > 0 ? Math.round(lgaStat.hh / lgaStat.wards) : 0
  const settPerDay     = lgaStat.days.size > 0 ? (lgaStat.sett / lgaStat.days.size).toFixed(1) : '0'
  const hhPerDay        = lgaStat.days.size > 0 ? Math.round(lgaStat.hh / lgaStat.days.size) : 0
  const allReportDates = [...new Set(raw.map(r => r.date))].sort()
  const consistencyPct = pct(lgaStat.days.size, allReportDates.length)
  const deviceYes      = lgaStat.devices || []
  const resolved       = deviceYes.filter(d => d.resolved?.toLowerCase() === 'yes').length
  const unresolved     = deviceYes.length - resolved
  const actKeys         = Object.keys(ACTIVITY_MAP)
  const actTotals        = actKeys.map(k => ({ key: k, label: ACTIVITY_MAP[k].label, count: lgaData.reduce((a, r) => a + (r[k] || 0), 0) })).filter(a => a.count > 0).sort((a, b) => b.count - a.count)

  const gaps = []
  for (let i = 1; i < allReportDates.length; i++) {
    const prev = allReportDates[i - 1], curr = allReportDates[i]
    if (!lgaStat.days.has(curr) && lgaStat.days.has(prev)) {
      let end = curr, j = i
      while (j < allReportDates.length && !lgaStat.days.has(allReportDates[j])) { end = allReportDates[j]; j++ }
      gaps.push({ from: prev, to: end, days: j - i })
    }
  }
  const longestGap = gaps.length ? gaps.reduce((a, b) => (b.days > a.days ? b : a)) : null

  // ── SLIDE 6 — POSITION IN STATE ──
  const s6 = newSlide(`${lga} LGA: Position in ${stateName}`)
  s6.addText(`Rankings against all ${totalLGAs} LGA Coordinators. Uses full state dataset regardless of date filters.`, { x: 0.35, y: 0.72, w: W - 0.7, h: 0.3, fontSize: 10, color: GRAY, fontFace: FONT })
  tileGrid(s6, [
    { label: 'SUBMISSION RANK', value: rankLabel(lgaSubRank, allSorted.length), note: `${lgaStat.n} reports vs avg ${Math.round(avg(allStats, 'n'))}`, color: lgaSubRank <= 10 ? GREEN : lgaSubRank >= allSorted.length - 9 ? RED : BRAND },
    { label: 'HOUSEHOLD COVERAGE RANK', value: rankLabel(lgaHHRank, allStats.length), note: `${lgaStat.hh.toLocaleString()} HH vs avg ${Math.round(stateAvgHH).toLocaleString()}` },
    { label: 'INSIDE-LGA PRESENCE RANK', value: rankLabel(lgaInsideRank, activeStats.length), note: `${lgaInPct}% vs state avg ${stateAvgInPct}%`, color: lgaInPct >= stateAvgInPct ? GREEN : RED },
  ], 1.05, 3)
  const headerCell = t => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: BRAND }, fontSize: 10 } })
  const cell = t => ({ text: String(t), options: { fontSize: 10, color: DARK, fontFace: FONT } })
  s6.addTable([
    [headerCell('Metric'), headerCell('Value'), headerCell('vs State Average')],
    [cell('Settlements covered'), cell(lgaStat.sett), cell(compare(lgaStat.sett, stateAvgSett))],
    [cell('Wards covered'), cell(lgaStat.wards), cell(compare(lgaStat.wards, stateAvgWards))],
    [cell('DC assignments'), cell(lgaStat.dcs), cell(compare(lgaStat.dcs, stateAvgDCS))],
  ], { x: 0.35, y: 2.55, w: W - 0.7, colW: [3.3, 2.6, 3.4], fontFace: FONT, border: { type: 'solid', color: LGRAY, pt: 0.5 }, autoPage: false })
  addFooter(s6)

  // ── SLIDE 7 — FIELD PRESENCE & COVERAGE ──
  const s7 = newSlide('Field Presence & Coverage')
  tileGrid(s7, [
    { label: 'INSIDE LGA', value: lgaStat.inside, note: `${lgaInPct}% of submissions`, color: lgaInPct >= stateAvgInPct ? GREEN : RED },
    { label: 'OUTSIDE LGA', value: lgaStat.n - lgaStat.inside, note: `${100 - lgaInPct}% of submissions` },
    { label: 'WARDS COVERED', value: lgaStat.wards, note: compare(lgaStat.wards, stateAvgWards) },
    { label: 'SETTLEMENTS COVERED', value: lgaStat.sett, note: compare(lgaStat.sett, stateAvgSett) },
    { label: 'HOUSEHOLDS VISITED', value: lgaStat.hh.toLocaleString(), note: compare(lgaStat.hh, stateAvgHH) },
    { label: 'HH PER WARD', value: hhPerWard || 'No data', note: 'depth of coverage per ward' },
    { label: 'SETTLEMENTS / DAY', value: settPerDay, note: 'pace of field coverage' },
    { label: 'HH / DAY', value: hhPerDay || 'No data', note: 'daily household reach' },
  ], 0.78, 4)
  let s7note, s7color
  if (lgaStat.hh === 0 && lgaStat.wards === 0) {
    s7note = `No ward, settlement, or household data recorded for ${lga}. Most likely cause: the coordinator isn't selecting "Field Coordination & Implementation" in the daily form — that selection triggers coverage questions. Recommend immediate follow-up.`
    s7color = RED
  } else if (lgaInPct >= 80) {
    s7note = `${lga} shows strong field discipline: ${lgaInPct}% of reports from within the assigned LGA, ${lgaInPct - stateAvgInPct} points above the state average.`
    s7color = GREEN
  } else if (lgaInPct < 60) {
    s7note = `${lga}'s inside-LGA rate of ${lgaInPct}% is ${stateAvgInPct - lgaInPct} points below the state average — worth investigating (boundary work or geofencing issues).`
    s7color = RED
  } else {
    s7note = `${lga} meets the minimum field-presence threshold at ${lgaInPct}% inside-LGA, with room to reach the 80%+ benchmark of top LGAs.`
    s7color = AMBER
  }
  s7.addText(s7note, { x: 0.35, y: 3.35, w: W - 0.7, h: 0.9, fontSize: 10.5, color: s7color, fontFace: FONT, valign: 'top' })
  addFooter(s7)

  // ── SLIDE 8 — TEAM MANAGEMENT ──
  const s8 = newSlide('Data Collector Team Management')
  tileGrid(s8, [
    { label: 'DC ASSIGNMENTS', value: lgaStat.dcs, note: `avg ${(lgaStat.dcs / Math.max(lgaStat.days.size, 1)).toFixed(1)}/active day` },
    { label: 'DC PARTIAL ATTENDANCE', value: lgaStat.dcs_partial, note: totalExpected > 0 ? `${pct(lgaStat.dcs_partial, totalExpected)}% of total` : '' },
    { label: 'DC ABSENCES', value: lgaStat.dcs_absent, note: totalExpected > 0 ? `${pct(lgaStat.dcs_absent, totalExpected)}% of total` : '', color: lgaStat.dcs_absent > 0 ? AMBER : GREEN },
    { label: 'DC ATTENDANCE RATE', value: totalExpected > 0 ? `${dcAttendRate}%` : 'N/A', note: 'present / (present+partial+absent)', color: dcAttendRate >= 80 ? GREEN : dcAttendRate >= 60 ? AMBER : RED },
    { label: 'FORMS COMPLETED', value: lgaStat.forms, note: compare(lgaStat.forms, stateAvgForms) },
    { label: 'FORMS PER DC', value: formPerDC, note: `state avg: ${stateFormPerDC}`, color: parseFloat(formPerDC) >= parseFloat(stateFormPerDC) ? GREEN : AMBER },
  ], 0.85, 3)
  addFooter(s8)

  // ── SLIDE 9 — ACTIVITY PROFILE ──
  if (actTotals.length) {
    tableSlide(`Activity Profile — ${lga}`,
      ['Activity Type', 'Reports', '% of Submissions'],
      actTotals.map(a => [a.label, `${a.count}`, `${pct(a.count, lgaStat.n)}%`]),
      'Activity types logged across all submissions. One report can include multiple activities.',
      [5.5, 1.7, 2.1])
  } else {
    bulletsSlide(`Activity Profile — ${lga}`, [{ text: 'No activity type data recorded for this LGA.', color: GRAY }])
  }

  // ── SLIDE 10 — ISSUES DEEP DIVE ──
  const s10 = newSlide('Issues Deep Dive')
  tileGrid(s10, [
    { label: 'CHALLENGES', value: lgaStat.challenges.length, color: lgaStat.challenges.length ? AMBER : GREEN },
    { label: 'CRITICAL', value: lgaStat.criticals.length, color: lgaStat.criticals.length ? RED : GREEN },
    { label: 'DEVICE ISSUES', value: deviceYes.length, note: deviceYes.length ? `${resolved}/${deviceYes.length} resolved` : '', color: unresolved > 0 ? RED : GREEN },
    { label: 'SECURITY', value: lgaStat.securities.length, color: lgaStat.securities.length ? RED : GREEN },
  ], 0.78, 4)

  const issueItems = [
    ...lgaStat.challenges.map(c => ({ text: `Challenge (${c.date}): ${truncate(c.desc, 110)}`, color: AMBER })),
    ...lgaStat.criticals.map(c => ({ text: `Critical (${c.date}): ${truncate(c.desc, 110)}`, color: RED })),
    ...lgaStat.devices.map(d => ({ text: `Device – ${cap(d.type) || 'Issue'} (${d.date}): ${truncate(d.desc, 90)} — ${d.resolved?.toLowerCase() === 'yes' ? '✓ Resolved' : '⏳ Pending'}`, color: d.resolved?.toLowerCase() === 'yes' ? GREEN : AMBER })),
    ...lgaStat.securities.map(s => ({ text: `Security (${s.date}): ${truncate(s.desc, 110)}`, color: RED })),
  ]
  if (issueItems.length === 0) {
    s10.addText('No issues were flagged for this LGA during the selected period.', { x: 0.35, y: 2.15, w: W - 0.7, h: 0.4, fontSize: 11, color: GREEN, fontFace: FONT })
  } else {
    const shown = issueItems.slice(0, 7)
    s10.addText(
      shown.map(b => ({ text: b.text, options: { bullet: { code: '2022' }, color: b.color, breakLine: true, fontSize: 9.5, paraSpaceAfter: 6 } })),
      { x: 0.35, y: 2.05, w: W - 0.7, h: H - 2.4, fontFace: FONT, valign: 'top' }
    )
    if (issueItems.length > shown.length) {
      s10.addText(`+ ${issueItems.length - shown.length} more — see the dashboard for the full issue log.`, { x: 0.35, y: H - 0.62, w: W - 0.7, h: 0.25, fontSize: 8.5, italic: true, color: GRAY, fontFace: FONT })
    }
  }
  addFooter(s10)

  // ── SLIDE 11 — CONSISTENCY & GAPS ──
  const s11 = newSlide('Consistency & Submission Gaps')
  tileGrid(s11, [
    { label: 'ACTIVE REPORTING DAYS', value: lgaStat.days.size, note: `of ${allReportDates.length} total days` },
    { label: 'CONSISTENCY RATE', value: `${consistencyPct}%`, note: 'submitted on X% of reporting days', color: consistencyPct >= 80 ? GREEN : consistencyPct >= 60 ? AMBER : RED },
    { label: 'SUBMISSION GAPS', value: gaps.length, note: gaps.length === 0 ? 'No gaps detected' : 'periods with no submission', color: gaps.length > 2 ? RED : gaps.length > 0 ? AMBER : GREEN },
    { label: 'LONGEST GAP', value: longestGap ? `${longestGap.days}d` : 'None', note: longestGap ? `${longestGap.from} → ${longestGap.to}` : '', color: longestGap && longestGap.days > 3 ? RED : AMBER },
  ], 0.78, 4)
  let s11note, s11color
  if (consistencyPct >= 85) { s11note = `${lga} shows excellent submission consistency at ${consistencyPct}% — a reliable, regular reporting pattern.`; s11color = GREEN }
  else if (consistencyPct >= 65) { s11note = `${lga} has moderate submission consistency (${consistencyPct}%). Some gaps may align with planned programme breaks, but unexplained gaps should be followed up.`; s11color = AMBER }
  else { s11note = `${lga} has low submission consistency at ${consistencyPct}%. Cross-reference gap dates with the programme schedule to identify unplanned absences.`; s11color = RED }
  s11.addText(s11note, { x: 0.35, y: 2.1, w: W - 0.7, h: 0.6, fontSize: 10.5, color: s11color, fontFace: FONT, valign: 'top' })
  if (gaps.length) {
    s11.addText(
      gaps.slice(0, 5).map(g => ({ text: `${g.from} → ${g.to}: ${g.days} day${g.days > 1 ? 's' : ''} without submission`, options: { bullet: { code: '2022' }, color: DARK, breakLine: true, fontSize: 9.5, paraSpaceAfter: 4 } })),
      { x: 0.35, y: 2.85, w: W - 0.7, h: H - 3.2, fontFace: FONT, valign: 'top' }
    )
  }
  addFooter(s11)

  // ── SLIDE 12 — RECOMMENDATIONS ──
  const recs = []
  if (lgaInPct < stateAvgInPct) recs.push({ text: `Field presence: inside-LGA rate of ${lgaInPct}% is below the state average of ${stateAvgInPct}%. Reinforce in-LGA presence expectations with the coordinator.`, color: DARK })
  if (lgaStat.hh === 0) recs.push({ text: `Coverage data gap: no household, ward, or settlement data recorded. Confirm the coordinator is selecting "Field Coordination & Implementation" in the daily form; re-train if necessary.`, color: DARK })
  if (lgaStat.dcs_absent > lgaStat.dcs * 0.15) recs.push({ text: `DC attendance: ${lgaStat.dcs_absent} absences recorded. Follow up to understand cause and ensure teams are adequately mobilised.`, color: DARK })
  if (unresolved > 0) recs.push({ text: `Device issues: ${unresolved} unresolved device issue${unresolved > 1 ? 's' : ''}. Coordinate with the technical team to resolve.`, color: DARK })
  if (consistencyPct < 70) recs.push({ text: `Submission consistency: at ${consistencyPct}%, review gap dates with the coordinator and establish whether absences are programme-related.`, color: DARK })
  if (parseFloat(formPerDC) > 0 && parseFloat(stateFormPerDC) > 0 && parseFloat(formPerDC) < parseFloat(stateFormPerDC) * 0.7) recs.push({ text: `Form completion: forms per DC (${formPerDC}) is well below the state average (${stateFormPerDC}). Investigate survey completion pace.`, color: DARK })
  if (lgaStat.criticals.length > 0) recs.push({ text: `Critical escalations: ${lgaStat.criticals.length} issue${lgaStat.criticals.length > 1 ? 's' : ''} flagged for state team attention. Confirm each has been actioned.`, color: DARK })
  if (recs.length === 0) recs.push({ text: `${lga} is performing well across all assessed dimensions. Continue monitoring and consider sharing practices with lower-performing LGAs.`, color: GREEN })

  bulletsSlide('Recommendations', recs, `Generated from the data above, specific to ${lga} LGA.`)

  pptx.writeFile({ fileName: `SARMAAN_${lga.replace(/\s+/g, '_')}_Report_${new Date().toISOString().slice(0, 10)}.pptx` })
}
