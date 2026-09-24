import { buildLGAStats, computeKPIs, ACTIVITY_MAP } from './dataUtils'

function formatDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function cap(s) { return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '' }
function pct(a, b) { return b ? Math.round(a / b * 100) : 0 }
function avg(arr, key) { return arr.length ? arr.reduce((a, r) => a + (r[key] || 0), 0) / arr.length : 0 }
function compare(val, stateAvg) {
  if (!stateAvg) return 'in line with the state average'
  const diff = Math.round((val - stateAvg) / stateAvg * 100)
  return diff >= 0 ? `${diff}% above the state average` : `${Math.abs(diff)}% below the state average`
}

// ─── eHA TRIP REPORT (.docx) ────────────────────────────────────────────────
// Reuses the same section headings as the uploaded eHA trip-report template
// (Purpose / Summary / Trip Details / Challenges / Opportunities /
// Recommended Actions / Photo), but every paragraph is generated from real
// computed dashboard numbers for the selected LGA - nothing here is invented.
export async function generateTripReportDocx({ lga, data, raw, dateRange, activeState, lgaCount }) {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    Table, TableRow, TableCell, WidthType, AlignmentType,
  } = await import('docx')

  const stateName = activeState?.name || 'Kano State'
  const programme = activeState?.shortLabel || 'Kano AMR'
  const totalLGAs = lgaCount ?? activeState?.totalLGAs ?? new Set(raw.map(r => r.lga)).size

  const lgaData   = lga === 'all' ? data : data.filter(r => r.lga === lga)
  const allStats  = buildLGAStats(raw)
  const lgaStats  = buildLGAStats(lgaData)
  const stateKPIs = computeKPIs(data)
  const lgaStat   = lgaStats.find(s => s.lga === lga) || null
  const activeStats = allStats.filter(s => s.n > 0)
  const period    = dateRange?.start ? `${dateRange.start} to ${dateRange.end}` : 'the full data collection period to date'
  const travelTo  = lga === 'all' ? `${stateName} (all ${totalLGAs} tracked LGAs)` : `${lga} LGA, ${stateName}`
  const scopeWho  = lga === 'all' ? 'State Coordination Team' : `${lga} LGA Coordinator`

  // ── header table (2x4 grid of label/value pairs) ──
  const BRAND = '0090FC' // the blue used throughout the original eHA trip-report template
  const labelCell = (text) => new TableCell({
    width: { size: 18, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: BRAND })] })],
  })
  const valueCell = (text) => new TableCell({
    width: { size: 32, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20 })] })],
  })
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1800, 3200, 1800, 3200],
    rows: [
      new TableRow({ children: [labelCell('To:'), valueCell('SARMAAN Project Management'), labelCell('Report Date:'), valueCell(formatDate())] }),
      new TableRow({ children: [labelCell('From:'), valueCell(scopeWho), labelCell('Travel To:'), valueCell(travelTo)] }),
      new TableRow({ children: [labelCell('CC:'), valueCell(`${programme} Team`), labelCell('Travel Dates:'), valueCell(cap(period))] }),
    ],
  })

  const heading = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text, color: BRAND, bold: true })] })
  const body = (text) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text })] })
  const bullet = (text) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text })] })

  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'eHA TRIP REPORT', bold: true, size: 32, color: BRAND })] }),
    headerTable,
  ]

  // ── Purpose ──
  children.push(heading('Purpose'))
  children.push(body(
    `This report documents field engagement in ${travelTo} under the ${programme} programme. ` +
    `The primary objective was coverage evaluation: coordinating and supervising data collection, ` +
    `verifying LC Coordinator field presence within assigned areas, and confirming ward, settlement, ` +
    `and household coverage during ${period}.`
  ))

  if (!lgaStat && lga !== 'all') {
    children.push(body(`No submissions were recorded for ${lga} LGA during ${period}, so the sections below reflect that.`))
  } else {
    const stat = lgaStat || { n: stateKPIs.total, inside: stateKPIs.inside, wards: stateKPIs.wards, sett: stateKPIs.settlements, hh: stateKPIs.hh, dcs: stateKPIs.dcsPresent, dcs_partial: stateKPIs.dcsPartial, dcs_absent: stateKPIs.dcsAbsent, forms: stateKPIs.formsCompleted, days: new Set(data.map(r => r.date)), challenges: [], criticals: [], devices: [], securities: [] }
    const inPct = pct(stat.inside, stat.n)
    const stateAvgInPct = pct(stateKPIs.inside, stateKPIs.total)

    // ── Summary ──
    children.push(heading('Summary'))
    children.push(body(
      `${lga === 'all' ? stateName : lga + ' LGA'} recorded ${stat.n} daily report${stat.n === 1 ? '' : 's'} across ${stat.days.size} active day${stat.days.size === 1 ? '' : 's'} during ${period}. ` +
      `${inPct}% of submissions were made from within the assigned LGA (state average: ${stateAvgInPct}%), and ${stat.forms} form${stat.forms === 1 ? '' : 's'} were completed by ${stat.dcs} data collector${stat.dcs === 1 ? '' : 's'} on assignment.`
    ))
    if (lga !== 'all') {
      children.push(body(
        `Coverage achieved: ${stat.wards} ward${stat.wards === 1 ? '' : 's'}, ${stat.sett} settlement${stat.sett === 1 ? '' : 's'}, and ${stat.hh.toLocaleString()} household${stat.hh === 1 ? '' : 's'} visited.`
      ))
    }

    // ── Trip/Conference Details ──
    children.push(heading('Trip/Conference Details'))
    const actTotals = Object.keys(ACTIVITY_MAP)
      .map(k => ({ label: ACTIVITY_MAP[k].label, count: lgaData.reduce((a, r) => a + (r[k] || 0), 0) }))
      .filter(a => a.count > 0)
      .sort((a, b) => b.count - a.count)
    if (actTotals.length) {
      children.push(body('Activities logged during this period, by type of report submitted:'))
      actTotals.forEach(a => children.push(bullet(`${a.label}: ${a.count} report${a.count === 1 ? '' : 's'}`)))
    } else {
      children.push(body('No specific activity types were logged for this scope during the selected period.'))
    }
    const totalExpected = stat.dcs + stat.dcs_partial + stat.dcs_absent
    if (totalExpected > 0) {
      children.push(body(
        `Data collector attendance: ${stat.dcs} present, ${stat.dcs_partial} partial, ${stat.dcs_absent} absent ` +
        `(${pct(stat.dcs, totalExpected)}% attendance rate).`
      ))
    }

    // ── Challenges ──
    children.push(heading('Challenges'))
    const issueLines = [
      ...(stat.challenges || []).map(c => `Operational challenge (${c.date}): ${c.desc || 'no description provided'}`),
      ...(stat.criticals || []).map(c => `Critical issue (${c.date}): ${c.desc || 'no description provided'}`),
      ...(stat.devices || []).map(d => `Device issue - ${cap(d.type) || 'unspecified'} (${d.date}): ${d.desc || 'no description'} - ${d.resolved?.toLowerCase() === 'yes' ? 'resolved' : 'unresolved'}`),
      ...(stat.securities || []).map(s => `Security/access incident (${s.date}): ${s.desc || 'no description provided'}`),
    ]
    if (issueLines.length) {
      issueLines.forEach(l => children.push(bullet(l)))
    } else {
      children.push(body('No challenges, critical issues, device problems, or security incidents were flagged for this scope during the selected period.'))
    }

    // ── Opportunities ──
    children.push(heading('Opportunities'))
    const strengths = []
    if (lga !== 'all') {
      if (inPct >= stateAvgInPct && stat.n > 0) strengths.push(`Field presence discipline is strong: ${compare(inPct, stateAvgInPct)} on inside-LGA reporting.`)
      const stateAvgHH = avg(activeStats, 'hh')
      if (stat.hh > stateAvgHH) strengths.push(`Household coverage (${stat.hh.toLocaleString()}) is ${compare(stat.hh, stateAvgHH)}.`)
      if (totalExpected > 0 && pct(stat.dcs, totalExpected) >= 80) strengths.push(`Data collector attendance is consistently high, supporting reliable field execution.`)
    }
    if (strengths.length) {
      strengths.forEach(s => children.push(bullet(s)))
    } else {
      children.push(body('No metric stood out as clearly above the state average for this scope during the selected period; performance is broadly in line with expectations.'))
    }

    // ── Recommended Actions ──
    children.push(heading('Recommended Actions'))
    const recs = []
    if (lga !== 'all') {
      if (inPct < stateAvgInPct) recs.push(`Reinforce in-LGA presence expectations with the coordinator - inside-LGA rate (${inPct}%) trails the state average (${stateAvgInPct}%).`)
      if (stat.hh === 0 && lga !== 'all') recs.push(`Confirm the coordinator is selecting "Field Coordination & Implementation" in the daily form - no household/ward/settlement data was recorded.`)
      if (stat.dcs_absent > stat.dcs * 0.15) recs.push(`Follow up on data collector absences (${stat.dcs_absent} recorded) to confirm adequate team mobilisation.`)
      const unresolvedDevices = (stat.devices || []).filter(d => d.resolved?.toLowerCase() !== 'yes').length
      if (unresolvedDevices > 0) recs.push(`Coordinate with the technical team to resolve ${unresolvedDevices} outstanding device issue${unresolvedDevices === 1 ? '' : 's'}.`)
      if ((stat.criticals || []).length > 0) recs.push(`Confirm each critical issue escalated from this LGA has been received and actioned by the state team.`)
    }
    if (recs.length === 0) recs.push(`Continue current field practices; no specific corrective action is indicated by the data for this period.`)
    recs.forEach(r => children.push(bullet(r)))
  }

  // ── Photo ──
  children.push(heading('Photo'))
  children.push(body(
    'Field photo evidence (activity photos, self-portraits, and signatures) is captured per submission in ' +
    'KoboToolbox but is not embedded in this auto-generated report. Attach relevant photos manually if required for submission.'
  ))

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `eHA_Trip_Report_${lga === 'all' ? stateName.replace(/\s+/g, '_') : lga.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
