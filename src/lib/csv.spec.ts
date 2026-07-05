import { describe, expect, it } from 'vitest'
import type { TeamRegistrationRow } from '~/server/db/teams'
import {
  EVENT_REGISTRATION_CSV_HEADERS,
  buildEventRegistrationsCsv,
  toCsv,
} from './csv'

// ---------------------------------------------------------------------------
// toCsv — generic serializer
// ---------------------------------------------------------------------------

describe('toCsv', () => {
  it('produces a header row followed by data rows', () => {
    // Arrange / Act
    const output = toCsv(
      ['Name', 'Age'],
      [
        ['Alice', '30'],
        ['Bob', '25'],
      ],
    )

    // Assert — BOM + header + two data rows
    expect(output).toBe('\uFEFFName,Age\r\nAlice,30\r\nBob,25')
  })

  it('wraps fields containing commas in double-quotes', () => {
    const output = toCsv(['Col'], [['hello, world']])
    expect(output).toContain('"hello, world"')
  })

  it('escapes embedded double-quotes by doubling them', () => {
    const output = toCsv(['Col'], [['say "hi"']])
    expect(output).toContain('"say ""hi"""')
  })

  it('returns only the header row for an empty dataset', () => {
    const output = toCsv(['A', 'B'], [])
    expect(output).toBe('\uFEFFA,B')
  })
})

// ---------------------------------------------------------------------------
// buildEventRegistrationsCsv — domain builder
// ---------------------------------------------------------------------------

function makeRow(
  overrides: Partial<TeamRegistrationRow> = {},
): TeamRegistrationRow {
  return {
    team: {
      id: 'team-1',
      name: 'Team Alpha',
      status: 'submitted',
      paymentStatus: 'unpaid',
      categoryId: 'cat-1',
      responsibleAdultName: 'Jane Doe',
      responsibleAdultPhone: '+45 12 34 56 78',
      responsibleAdultEmail: 'jane@example.com',
      organization: 'Robot Club',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    categoryName: 'RoboMission Senior',
    participants: [
      {
        id: 'p-1',
        teamId: 'team-1',
        name: 'Alice',
        birthYear: 2012,
        createdAt: new Date('2026-01-01'),
      },
    ],
    ...overrides,
  }
}

describe('buildEventRegistrationsCsv', () => {
  it('includes all expected column headers', () => {
    // Arrange / Act
    const csv = buildEventRegistrationsCsv([])
    const headerLine = csv.replace('\uFEFF', '').split('\r\n')[0] ?? ''
    const headers = headerLine.split(',')

    // Assert — one column per required field
    for (const expected of EVENT_REGISTRATION_CSV_HEADERS) {
      expect(headers).toContain(expected)
    }
  })

  it('produces one data row per team registration', () => {
    // Arrange
    const rows = [
      makeRow(),
      makeRow({ team: { ...makeRow().team, id: 'team-2', name: 'Team Beta' } }),
    ]

    // Act
    const csv = buildEventRegistrationsCsv(rows)
    const lines = csv.replace('\uFEFF', '').split('\r\n')

    // Assert — 1 header + 2 data rows
    expect(lines).toHaveLength(3)
  })

  it('includes team name, category, status, and payment in each row', () => {
    // Arrange / Act
    const csv = buildEventRegistrationsCsv([makeRow()])

    // Assert
    expect(csv).toContain('Team Alpha')
    expect(csv).toContain('RoboMission Senior')
    expect(csv).toContain('submitted')
    expect(csv).toContain('unpaid')
  })

  it('formats participants as "Name (BirthYear)" joined by semicolons', () => {
    // Arrange
    const row = makeRow({
      participants: [
        {
          id: 'p-1',
          teamId: 'team-1',
          name: 'Alice',
          birthYear: 2012,
          createdAt: new Date(),
        },
        {
          id: 'p-2',
          teamId: 'team-1',
          name: 'Bob',
          birthYear: 2013,
          createdAt: new Date(),
        },
      ],
    })

    // Act
    const csv = buildEventRegistrationsCsv([row])

    // Assert
    expect(csv).toContain('Alice (2012); Bob (2013)')
  })

  it('includes responsible adult contact fields', () => {
    // Arrange / Act
    const csv = buildEventRegistrationsCsv([makeRow()])

    // Assert
    expect(csv).toContain('Jane Doe')
    expect(csv).toContain('+45 12 34 56 78')
    expect(csv).toContain('jane@example.com')
    expect(csv).toContain('Robot Club')
  })

  it('produces an empty-data CSV (header only) when there are no registrations', () => {
    // Arrange / Act
    const csv = buildEventRegistrationsCsv([])
    const lines = csv.replace('\uFEFF', '').split('\r\n')

    // Assert — only the header row
    expect(lines).toHaveLength(1)
  })
})
