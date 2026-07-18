/**
 * Gallery Metadata Status
 *
 * Prints an at-a-glance report of which gallery photos have their
 * descriptive fields filled in (alt, description, event, favorite, focal
 * point) and which are still lacking — the "step 1: surface what's missing"
 * companion to `gallery:add`, which deliberately leaves alt text blank.
 *
 * For every photo that still needs attention it prints a deep-link straight
 * into that entry's Sveltia CMS editor, where the image preview and the
 * metadata form sit side by side — so filling things in doesn't mean
 * juggling a photo viewer and a .md file in separate windows. Run the site
 * (`npm run dev`), open a link, and click "Work with Local Repository" in
 * Sveltia to edit your just-added, not-yet-committed files in place.
 *
 * Read-only — it never touches content. Override the CMS origin with
 * WRO_ADMIN_URL if you don't dev on the default http://localhost:3000.
 *
 * Run with: npm run gallery:status
 */

import { readGalleryReports } from './gallery-metadata'
import type { EntryStatus, GalleryEntryReport } from './gallery-metadata'

const ADMIN_URL = process.env.WRO_ADMIN_URL ?? 'http://localhost:3000/admin'

const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined

type Paint = (text: string) => string

function makePaint(code: string): Paint {
  return (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text)
}

const bold = makePaint('1')
const dim = makePaint('2')
const red = makePaint('31')
const green = makePaint('32')
const yellow = makePaint('33')
const cyan = makePaint('36')

function editUrl(slug: string): string {
  return `${ADMIN_URL}/#/collections/gallery/entries/${slug}`
}

/**
 * A table cell as plain `text` plus an optional `color`, so column widths
 * can be measured on the uncoloured text (ANSI escapes would otherwise
 * inflate `.length` and break alignment) and colour applied only once the
 * cell has been padded.
 */
interface Cell {
  text: string
  color?: Paint
}

function render(cell: Cell): string {
  return cell.color ? cell.color(cell.text) : cell.text
}

function altCell(report: GalleryEntryReport): Cell {
  return report.needsAlt
    ? { text: '✗', color: red }
    : { text: '✓', color: green }
}

function descriptionCell(report: GalleryEntryReport): Cell {
  return report.needsDescription
    ? { text: '○', color: dim }
    : { text: '✓', color: green }
}

function eventCell(report: GalleryEntryReport): Cell {
  return report.event === undefined
    ? { text: '—', color: dim }
    : { text: report.event }
}

function favoriteCell(report: GalleryEntryReport): Cell {
  return report.favorite
    ? { text: '★', color: yellow }
    : { text: '·', color: dim }
}

function focalCell(report: GalleryEntryReport): Cell {
  return report.position === undefined
    ? { text: '·', color: dim }
    : { text: report.position }
}

interface Column {
  header: string
  cell: (report: GalleryEntryReport) => Cell
}

const COLUMNS: Array<Column> = [
  { header: 'PHOTO', cell: (report) => ({ text: report.slug }) },
  { header: 'ALT', cell: altCell },
  { header: 'DESC', cell: descriptionCell },
  { header: 'EVENT', cell: eventCell },
  { header: 'FAV', cell: favoriteCell },
  { header: 'FOCAL', cell: focalCell },
]

function pad(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - text.length))
}

function renderTable(reports: Array<GalleryEntryReport>): void {
  const cells = reports.map((report) =>
    COLUMNS.map((column) => column.cell(report)),
  )

  const widths = COLUMNS.map((column, i) =>
    Math.max(column.header.length, ...cells.map((row) => row[i].text.length)),
  )

  const headerRow = COLUMNS.map((column, i) =>
    dim(pad(column.header, widths[i])),
  ).join('  ')
  console.log(`  ${headerRow}`)

  for (const row of cells) {
    const line = row
      .map((cell, i) => render({ ...cell, text: pad(cell.text, widths[i]) }))
      .join('  ')
    console.log(`  ${line}`)
  }
}

/** The human-readable list of what a single photo is still missing. */
function describeGaps(report: GalleryEntryReport): Array<string> {
  const gaps: Array<string> = []
  if (report.missingImage) {
    gaps.push(
      report.image === undefined
        ? 'no image field'
        : `image file ${report.image} is missing`,
    )
  }
  if (report.needsAlt) gaps.push('alt text')
  if (report.needsDescription) gaps.push('description')
  return gaps
}

function renderAttention(reports: Array<GalleryEntryReport>): void {
  const needsAttention = reports.filter(
    (report) => report.status !== 'complete',
  )
  if (needsAttention.length === 0) return

  console.log('')
  console.log(bold('Needs attention'))

  for (const report of needsAttention) {
    const marker = report.status === 'blocked' ? red('✗') : yellow('~')
    const gaps = describeGaps(report).join(', ')
    console.log(`  ${marker} ${bold(report.slug)} ${dim(`— ${gaps}`)}`)
    if (report.imagePath !== undefined) {
      console.log(`      ${dim('photo')}  ${report.imagePath}`)
    }
    console.log(`      ${dim('edit')}   ${cyan(editUrl(report.slug))}`)
  }
}

function countBy(
  reports: Array<GalleryEntryReport>,
  status: EntryStatus,
): number {
  return reports.filter((report) => report.status === status).length
}

function renderSummary(reports: Array<GalleryEntryReport>): void {
  const blocked = countBy(reports, 'blocked')
  const sparse = countBy(reports, 'sparse')
  const complete = countBy(reports, 'complete')
  const missingAlt = reports.filter((report) => report.needsAlt).length
  const missingDescription = reports.filter(
    (report) => report.needsDescription,
  ).length

  console.log('')
  console.log(bold('Summary'))
  console.log(
    `  ${red('✗')} ${String(missingAlt).padStart(2)} missing alt text ${dim('(blocks `npm run lint`)')}`,
  )
  console.log(
    `  ${dim('○')} ${String(missingDescription).padStart(2)} missing a description`,
  )
  console.log(
    `  ${green('✓')} ${String(complete).padStart(2)} fully described${sparse > 0 ? dim(`  (+${sparse} publishable but thin)`) : ''}`,
  )

  if (blocked === 0 && sparse === 0) {
    console.log('')
    console.log(green('Every photo is fully described. Nothing to enrich. 🎉'))
    return
  }

  console.log('')
  console.log(
    dim(
      'Fill these in with the photo in view: run `npm run dev`, open an edit link\n' +
        '  above, then click "Work with Local Repository" in Sveltia to edit your\n' +
        '  local (even uncommitted) files — image preview and form side by side.',
    ),
  )
}

function main(): void {
  const reports = readGalleryReports()

  console.log('')
  console.log(
    bold(
      `Gallery metadata — ${reports.length} photo${reports.length === 1 ? '' : 's'} in content/gallery/`,
    ),
  )

  if (reports.length === 0) {
    console.log('')
    console.log(
      dim('No gallery entries yet. Add some with `npm run gallery:add`.'),
    )
    return
  }

  console.log(
    dim(
      `Legend: ${green('✓')} set   ${red('✗')} missing (blocks lint)   ${dim('○')} optional, empty`,
    ),
  )
  console.log('')

  renderTable(reports)
  renderAttention(reports)
  renderSummary(reports)
  console.log('')
}

main()
