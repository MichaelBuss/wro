import type { TeamRegistrationRow } from '~/server/db/teams'

/**
 * Escape a single CSV field per RFC 4180.
 * Fields containing commas, double-quotes, or line breaks are wrapped in
 * double-quotes; embedded double-quotes are escaped by doubling them.
 */
function escapeCsvField(value: string): string {
  if (
    value.includes('"') ||
    value.includes(',') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Serialize headers and rows to a UTF-8 CSV string.
 * A BOM is prepended so that Excel opens the file correctly without needing
 * an import wizard.
 */
export function toCsv(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<Array<string>>,
): string {
  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ]
  return '\uFEFF' + lines.join('\r\n')
}

// ---------------------------------------------------------------------------
// Domain-specific builder for the organizer per-event registration export
// ---------------------------------------------------------------------------

export const EVENT_REGISTRATION_CSV_HEADERS = [
  'Holdnavn',
  'Kategori',
  'Deltagere',
  'Ansvarlig voksen',
  'Telefon',
  'Email',
  'Organisation',
  'Status',
  'Betaling',
] as const

/**
 * Produce a CSV string from team registration rows for a single Event.
 * One CSV row per Team; participants are joined as "Name (BirthYear); …".
 */
export function buildEventRegistrationsCsv(
  rows: ReadonlyArray<TeamRegistrationRow>,
): string {
  const csvRows = rows.map((row) => [
    row.team.name,
    row.categoryName,
    row.participants.map((p) => `${p.name} (${p.birthYear})`).join('; '),
    row.team.responsibleAdultName ?? '',
    row.team.responsibleAdultPhone ?? '',
    row.team.responsibleAdultEmail ?? '',
    row.team.organization ?? '',
    row.team.status,
    row.team.paymentStatus,
  ])

  return toCsv(EVENT_REGISTRATION_CSV_HEADERS, csvRows)
}
