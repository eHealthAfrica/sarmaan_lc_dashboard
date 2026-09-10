// Each entry is one state's dashboard. `dataFile` is fetched relative to the
// site's own root (see src/hooks/useData.js) - it must match a file
// fetch_data.py writes under data/ and that .github/workflows/deploy.yml
// copies into public/data/.
//
// `totalLGAs` is the real, known number of LGAs in the state - it is NOT
// derived from the data, because an LGA with zero submissions would never
// show up in the data at all, and we still want to flag "N LGAs have never
// reported" accurately. If a new state's LGA count isn't known yet, omit
// totalLGAs and the app falls back to counting only LGAs actually present
// in the data (see resolveTotalLGAs in App.jsx).
export const STATES = [
  {
    slug: 'kano',
    name: 'Kano State (AMR)',
    shortLabel: 'Kano AMR',
    dataFile: 'data/data.json',
    totalLGAs: 44,
    contextNote: 'May 13-17: coordinators at centralized AMR training (Mumbayya House, Dala LGA). Field deployment began May 18. May 21-22: break for data and sample review. Data collection continued May 23-24. May 25 - Jun 2: National break. Data collection resumed June 3.',
  },
  {
    slug: 'jigawa',
    name: 'Jigawa State (Coverage)',
    shortLabel: 'Jigawa Coverage',
    dataFile: 'data/data-jigawa.json',
    // Only 6 of Jigawa's 27 LGAs are tracked by this survey: Kaugama, Kiri
    // Kasamma, Kiyawa, Miga, Taura, Yankwashi (per coverage_coverage/Jigawa/c_data.csv).
    totalLGAs: 6,
  },
  {
    slug: 'kaduna',
    name: 'Kaduna State (Coverage)',
    shortLabel: 'Kaduna Coverage',
    dataFile: 'data/data-kaduna.json',
    // 6 of Kaduna's 23 LGAs are tracked by this survey (confirmed):
    // Chikun, Jaba, Jemaa, Kajuru, Soba, Zaria.
    totalLGAs: 6,
  },
  {
    slug: 'bauchi',
    name: 'Bauchi State (Coverage)',
    shortLabel: 'Bauchi Coverage',
    dataFile: 'data/data-bauchi.json',
    // 6 LGAs tracked by this survey (confirmed): Darazo, Zaki, Dambam,
    // Toro, Itas Gadau, Tafawa Balewa. Toro hadn't submitted yet as of
    // the first real fetch.
    totalLGAs: 6,
  },
  {
    slug: 'kanocoverage',
    // Distinguishes from the "Kano State" (AMR) entry above in the state
    // toggle - same state, separate survey/asset, own data file.
    name: 'Kano State (Coverage)',
    shortLabel: 'Kano Coverage',
    dataFile: 'data/data-kanocoverage.json',
    // 6 LGAs tracked by this survey (confirmed): Rano, Garko, Kumbotso,
    // Rimin Gado, Gwale, Tsanyawa. Garko hadn't submitted yet as of the
    // first real fetch.
    totalLGAs: 6,
  },
]

export const DEFAULT_STATE = STATES[0]
