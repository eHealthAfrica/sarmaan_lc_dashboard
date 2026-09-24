// ─── MONTHLY TIMESHEET (.docx) ──────────────────────────────────────────────
// Matches the eHealth Africa Monthly Timesheet template structure, but
// identifies the LGA Coordinator by Ward/LGA rather than name (per request -
// this is generated from the LGA already selected in the report modal, so no
// name ever needs to be entered or shown).
//
// Hours per day come from fetch_data.py's hours_worked field: the gap
// between the KoboToolbox `starttime` (when the LC opened the form) and
// `_submission_time` (when it reached the server) for that day's submission.
// If a day has more than one submission, their hours are summed.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December']

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }

export async function generateTimesheetDocx({ lga, data, monthStart, activeState }) {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  } = await import('docx')

  const stateName = activeState?.name || 'Kano State'
  const programme = activeState?.shortLabel || 'Kano AMR'

  if (lga === 'all') {
    throw new Error('Select a specific LGA to generate a timesheet - it reports one LGA Coordinator\'s hours.')
  }
  const lgaData = data.filter(r => r.lga === lga)

  // Default reporting month if not explicitly given: this LGA's own most
  // recent submission date, not a fixed calendar month - Kano's real data
  // lands in its May/June survey period, Jigawa's in August, and neither
  // should be hardcoded to the other's.
  let anchor
  if (monthStart) {
    anchor = new Date(monthStart)
  } else {
    const dates = lgaData.map(r => r.date).filter(Boolean).sort()
    anchor = dates.length ? new Date(dates[dates.length - 1]) : new Date()
  }
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const monthName = MONTH_NAMES[month]
  const numDays = daysInMonth(year, month)

  // Sum hours_worked per day-of-month, and collect distinct wards seen.
  const hoursByDay = new Array(numDays + 1).fill(0) // index 1..numDays
  const wards = new Set()
  lgaData.forEach(r => {
    const d = new Date(r.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      hoursByDay[day] += r.hours_worked || 0
    }
    if (r.ward) wards.add(r.ward)
  })
  const totalHours = hoursByDay.reduce((a, h) => a + h, 0)
  const totalDays = hoursByDay.filter(h => h > 0).length
  const wardLabel = wards.size ? [...wards].sort().join(', ') : 'Not recorded'

  const BLUE = '0090FC'
  const boldCell = (text, opts = {}) => new TableCell({
    width: opts.width || { size: 100 / (numDays + 2), type: WidthType.PERCENTAGE },
    shading: opts.shade ? { fill: opts.shade } : undefined,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: opts.bold, size: 16 })] })],
  })

  const dayHeaderRow = new TableRow({
    children: [
      boldCell('', { width: { size: 4, type: WidthType.PERCENTAGE } }),
      boldCell('Description/Dates', { bold: true, width: { size: 16, type: WidthType.PERCENTAGE } }),
      ...Array.from({ length: numDays }, (_, i) => boldCell(String(i + 1), { bold: true })),
      boldCell('Total Hours', { bold: true, width: { size: 8, type: WidthType.PERCENTAGE } }),
      boldCell('Total Days', { bold: true, width: { size: 8, type: WidthType.PERCENTAGE } }),
    ],
  })
  const dutyRow = new TableRow({
    children: [
      boldCell('A'),
      boldCell('Number of Hours - Official Duty by Project/Donor', { shade: 'D9D9D9' }),
      ...Array.from({ length: numDays }, () => boldCell('', { shade: 'D9D9D9' })),
      boldCell('', { shade: 'D9D9D9' }),
      boldCell('', { shade: 'D9D9D9' }),
    ],
  })
  const projectRow = new TableRow({
    children: [
      boldCell('H'),
      boldCell(`SARMAAN - ${programme}`),
      ...hoursByDay.slice(1).map(h => boldCell(h > 0 ? String(h) : '')),
      boldCell(String(Math.round(totalHours * 100) / 100)),
      boldCell(String(totalDays)),
    ],
  })
  const totalRow = new TableRow({
    children: [
      boldCell('', { shade: 'FFFF00' }),
      boldCell('Total Number Hours', { bold: true, shade: 'FFFF00' }),
      ...hoursByDay.slice(1).map(h => boldCell(h > 0 ? String(h) : '', { shade: 'FFFF00' })),
      boldCell(String(Math.round(totalHours * 100) / 100), { bold: true, shade: 'FFFF00' }),
      boldCell(String(totalDays), { bold: true, shade: 'FFFF00' }),
    ],
  })

  const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [dayHeaderRow, dutyRow, projectRow, totalRow] })

  const fieldLine = (label, value) => new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value }),
    ],
  })

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'eHEALTH AFRICA', bold: true, size: 28, color: BLUE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'MONTHLY TIMESHEET', bold: true, size: 24, color: BLUE })] }),
        fieldLine('Month', monthName),
        fieldLine('Ward / LGA', `${wardLabel} / ${lga} LGA`),
        fieldLine('Location', stateName.replace(/\s+State$/i, '')),
        fieldLine('Directorate/Div./Dept', programme),
        new Paragraph({ text: '', spacing: { after: 200 } }),
        table,
        new Paragraph({ text: '', spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: 'Employee Signature: ________________________     Date: ________________' })] }),
        new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Approval Signature: ________________________     Date: ________________' })] }),
        new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'Note: hours computed from KoboToolbox form-open time to server submission time; not a substitute for manually verified hours.', italics: true, size: 16 })] }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Timesheet_${lga.replace(/\s+/g, '_')}_${monthName}_${year}.docx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
