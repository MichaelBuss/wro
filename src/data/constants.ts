export const CONSTANTS = {
  DANISH_FINAL_DATE: new Date('2026-08-21'),
  DANISH_FINAL_LOCATION: 'Århus Universitet',
  DANISH_FINAL_TIME: '09:00 - 17:00',
  WORLD_FINAL_LOCATION: 'New York, USA',
}

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

