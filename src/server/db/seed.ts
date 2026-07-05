import { eq } from 'drizzle-orm'
import type { Database } from './client'
import { category, event } from './schema'
import type { CategoryRow, EventRow } from './schema'

/**
 * Seed a baseline WRO Denmark 2026 Competition event with the standard WRO
 * category lineup. Safe to call multiple times — skips if the event already
 * exists (idempotent by event id).
 */

interface SeededEvent {
  event: EventRow
  categories: Array<CategoryRow>
}

// WRO 2026 age bands expressed as birth years.
// Ages are relative to the competition year (2026):
//   age N → born in (2026 - N)
// The band [min..max] covers ages [maxAge..minAge] → birth years [2026-maxAge..2026-minAge].
const WRO_2026_CATEGORIES: Array<{
  name: string
  minBirthYear: number
  maxBirthYear: number
}> = [
  // RoboMission Elementary: ages 8–12 → born 2014–2018
  { name: 'RoboMission Elementary', minBirthYear: 2014, maxBirthYear: 2018 },
  // RoboMission Junior: ages 11–15 → born 2011–2015
  { name: 'RoboMission Junior', minBirthYear: 2011, maxBirthYear: 2015 },
  // RoboMission Senior: ages 14–18 → born 2008–2012
  { name: 'RoboMission Senior', minBirthYear: 2008, maxBirthYear: 2012 },
  // Future Innovators: ages 8–17 → born 2009–2018
  { name: 'Future Innovators', minBirthYear: 2009, maxBirthYear: 2018 },
  // RoboSports Junior: ages 11–15 → born 2011–2015
  { name: 'RoboSports Junior', minBirthYear: 2011, maxBirthYear: 2015 },
  // RoboSports Senior: ages 14–18 → born 2008–2012
  { name: 'RoboSports Senior', minBirthYear: 2008, maxBirthYear: 2012 },
]

export async function seedBaselineEvent(db: Database): Promise<SeededEvent> {
  const now = new Date()
  const eventId = 'wro-dk-2026'

  // Upsert the event so this is idempotent.
  const insertedRows = await db
    .insert(event)
    .values({
      id: eventId,
      name: 'WRO Denmark 2026',
      kind: 'competition',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning()

  // If insert was a no-op (event already exists), fetch it by id.
  const seededEvent: EventRow =
    insertedRows.length > 0
      ? insertedRows[0]
      : (await db.select().from(event).where(eq(event.id, eventId)))[0]

  // Only seed categories if they don't exist yet.
  const existingCategories = await db
    .select()
    .from(category)
    .where(eq(category.eventId, eventId))

  if (existingCategories.length > 0) {
    return { event: seededEvent, categories: existingCategories }
  }

  const categoryValues = WRO_2026_CATEGORIES.map((c) => ({
    id: crypto.randomUUID(),
    eventId,
    name: c.name,
    minBirthYear: c.minBirthYear,
    maxBirthYear: c.maxBirthYear,
    createdAt: now,
    updatedAt: now,
  }))

  const seededCategories = await db
    .insert(category)
    .values(categoryValues)
    .returning()

  return { event: seededEvent, categories: seededCategories }
}
