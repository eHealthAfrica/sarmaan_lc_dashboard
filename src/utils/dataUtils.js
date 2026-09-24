// Filter raw data based on active filters
export function applyFilters(raw, filters) {
  const { dates, status, lga, ward, wardStatus, dateRange } = filters
  return raw.filter(r => {
    if (dates && dates.size > 0 && !dates.has(r.date)) return false
    if (dateRange?.start && r.date < dateRange.start) return false
    if (dateRange?.end && r.date > dateRange.end) return false
    if (status !== 'all' && r.status !== status) return false
    if (lga !== 'all' && r.lga !== lga) return false
    if (ward && ward !== 'all' && r.ward !== ward) return false
    if (wardStatus && wardStatus !== 'all' && r.ward_status !== wardStatus) return false
    return true
  })
}

// True if any row has ward-level geofence data - only Jigawa's form asks
// this (grp_geofence_ward), so this naturally scopes ward UI/columns to
// whichever state(s) actually have it, without hardcoding a state name.
export function hasWardData(raw) {
  return raw.some(r => r.ward_status === 'inside' || r.ward_status === 'outside')
}

// Unique ward names present in the data, for the Ward filter dropdown.
export function getUniqueWards(raw) {
  return [...new Set(raw.map(r => r.ward).filter(Boolean))].sort()
}

// Build per-LGA aggregate stats
export function buildLGAStats(data) {
  const map = {}
  data.forEach(r => {
    if (!map[r.lga]) map[r.lga] = {
      lga: r.lga, coord: r.coord,
      n: 0, inside: 0,
      insideWard: 0, wardChecked: 0,
      wards: 0, sett: 0, hh: 0,
      dcs: 0, dcs_partial: 0, dcs_absent: 0, forms: 0,
      ch: 0, critical: 0, device: 0, security: 0,
      days: new Set(), lastDate: '',
      challenges: [], criticals: [], devices: [], securities: [],
    }
    const l = map[r.lga]
    l.n++
    if (r.status === 'inside') l.inside++
    if (r.ward_status === 'inside' || r.ward_status === 'outside') {
      l.wardChecked++
      if (r.ward_status === 'inside') l.insideWard++
    }
    l.wards    += r.wards        || 0
    l.sett     += r.settlements  || 0
    l.hh       += r.hh           || 0
    l.dcs      += r.dcs          || 0
    l.dcs_partial += r.dcs_partial || 0
    l.dcs_absent  += r.dcs_absent  || 0
    l.forms    += r.forms_completed || 0
    if (r.challenges === 'Yes') { l.ch++; if (r.challenge_desc) l.challenges.push({ date: r.date, desc: r.challenge_desc }) }
    if (r.critical   === 'Yes') { l.critical++; if (r.critical_desc) l.criticals.push({ date: r.date, desc: r.critical_desc }) }
    if (r.device     === 'Yes') { l.device++; if (r.device_details?.length) r.device_details.forEach(d => l.devices.push({ date: r.date, ...d })) }
    if (r.security   === 'Yes') { l.security++; l.securities.push({ date: r.date, desc: r.security_desc || '', location: r.security_location || '', action: r.security_action || '' }) }
    l.days.add(r.date)
    if (!l.lastDate || r.date > l.lastDate) l.lastDate = r.date
  })
  return Object.values(map)
}

// Build daily time series
export function buildTimeSeries(raw, data) {
  const allDates = [...new Set(raw.map(r => r.date))].sort()
  return allDates.map(date => {
    const dayRows = data.filter(r => r.date === date)
    return {
      date,
      label: date.slice(5),
      total: dayRows.length,
      inside: dayRows.filter(r => r.status === 'inside').length,
      outside: dayRows.filter(r => r.status === 'outside').length,
      insideWard: dayRows.filter(r => r.ward_status === 'inside').length,
      outsideWard: dayRows.filter(r => r.ward_status === 'outside').length,
      wards: dayRows.reduce((a, r) => a + (r.wards || 0), 0),
      settlements: dayRows.reduce((a, r) => a + (r.settlements || 0), 0),
      hh: dayRows.reduce((a, r) => a + (r.hh || 0), 0),
      dcs: dayRows.reduce((a, r) => a + (r.dcs || 0), 0),
      forms: dayRows.reduce((a, r) => a + (r.forms_completed || 0), 0),
    }
  })
}

// Compute summary KPIs
export function computeKPIs(data) {
  const inside        = data.filter(r => r.status === 'inside').length
  const wardChecked    = data.filter(r => r.ward_status === 'inside' || r.ward_status === 'outside').length
  const insideWard     = data.filter(r => r.ward_status === 'inside').length
  const totalDCS      = data.reduce((a, r) => a + (r.dcs || 0), 0)
  const totalPartial  = data.reduce((a, r) => a + (r.dcs_partial || 0), 0)
  const totalAbsent   = data.reduce((a, r) => a + (r.dcs_absent || 0), 0)
  const totalForms    = data.reduce((a, r) => a + (r.forms_completed || 0), 0)
  const totalExpected = totalDCS + totalPartial + totalAbsent
  return {
    total:        data.length,
    activeLGAs:   new Set(data.map(r => r.lga)).size,
    insidePct:    data.length ? Math.round(inside / data.length * 100) : 0,
    inside,
    wardChecked,
    insideWard,
    insideWardPct: wardChecked ? Math.round(insideWard / wardChecked * 100) : 0,
    wards:        data.reduce((a, r) => a + (r.wards || 0), 0),
    settlements:  data.reduce((a, r) => a + (r.settlements || 0), 0),
    hh:           data.reduce((a, r) => a + (r.hh || 0), 0),
    dcsPresent:   totalDCS,
    dcsPartial:   totalPartial,
    dcsAbsent:    totalAbsent,
    formsCompleted: totalForms,
    dcAttendancePct: totalExpected ? Math.round(totalDCS / totalExpected * 100) : 0,
    formCompletionRate: totalDCS ? Math.round(totalForms / totalDCS * 100) : 0,
    challenges:   data.filter(r => r.challenges === 'Yes').length,
    critical:     data.filter(r => r.critical === 'Yes').length,
    device:       data.filter(r => r.device === 'Yes').length,
    security:     data.filter(r => r.security === 'Yes').length,
    avgSettPerDay: 0, // computed below
  }
}

export function getYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function getUniqueSorted(raw, key) {
  return [...new Set(raw.map(r => r[key]).filter(Boolean))].sort()
}

export const ACTIVITY_MAP = {
  training:       { label: 'Survey / Data Collection Training', color: '#2563eb' },
  fieldCoord:     { label: 'Field Coordination & Implementation', color: '#1D9E75' },
  supervision:    { label: 'Supervision & Quality Assurance', color: '#d97706' },
  dataMonitor:    { label: 'Data Monitoring & Reporting', color: '#dc2626' },
  stakeholder:    { label: 'Stakeholder Engagement', color: '#7c3aed' },
  teamMgmt:       { label: 'Team Management & Support', color: '#155c3a' },
  problemSolving: { label: 'Problem Solving & Escalation', color: '#9f1239' },
  transit:        { label: 'Transit', color: '#6b7280' },
}
