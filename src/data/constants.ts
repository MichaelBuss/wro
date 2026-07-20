// TODO(content): unverified — exact program/times for the Danish final are not
// published on the live site yet; see docs/content-todo.md
export const DANISH_FINAL_SCHEDULE = [
  {
    time: '08:00',
    title: 'Ankomst & Check-in',
    description: 'Registrering og opsætning af robotter',
  },
  {
    time: '09:00',
    title: 'Åbningsceremoni',
    description: 'Velkomst og gennemgang af dagens program',
  },
  {
    time: '09:30',
    title: 'Konkurrencer starter',
    description: 'Første runde af alle kategorier',
  },
  {
    time: '12:00',
    title: 'Frokostpause',
    description: 'Mad og networking',
  },
  {
    time: '13:00',
    title: 'Finaler',
    description: 'Afgørende runder i alle kategorier',
  },
  {
    time: '16:00',
    title: 'Præmieoverrækkelse',
    description: 'Vindere kåres og præmier uddeles',
  },
] as const

// WRO Open Championships — regional finals held between the national final
// and the world final. Deltagelse kræver interesse-tilmelding inden fristen.
// Source: live site's Tilmelding page.
export const OPEN_CHAMPIONSHIPS = [
  {
    region: 'Americas',
    location: 'Ontario, California, USA',
    dates: '25.–27. september 2026',
  },
  {
    region: 'Asia & Pacific',
    location: 'India (sted annonceres senere)',
    dates: '25.–27. september 2026',
  },
  {
    region: 'Europe',
    location: 'Zagreb, Kroatien',
    dates: '13.–16. oktober 2026',
  },
] as const

export const OPEN_CHAMPIONSHIP_INTEREST_DEADLINE = '14. februar 2026, 12:00'
