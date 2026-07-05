/**
 * Age-band eligibility for Participants.
 *
 * A Category's band is expressed as a birth-year range
 * (minBirthYear..maxBirthYear, inclusive). Null on either end means "no
 * bound". The check is a soft warning — it never blocks saving.
 */

export interface AgeBand {
  minBirthYear: number | null
  maxBirthYear: number | null
}

/**
 * Returns `true` if the participant's birth year falls within the category's
 * age band, `false` if a warning should be shown.
 *
 * A null bound is treated as unbounded on that side:
 *   - null minBirthYear → any participant is old enough
 *   - null maxBirthYear → any participant is young enough
 */
export function checkAgeBandEligibility(
  birthYear: number,
  band: AgeBand,
): boolean {
  if (band.minBirthYear !== null && birthYear < band.minBirthYear) {
    return false
  }
  if (band.maxBirthYear !== null && birthYear > band.maxBirthYear) {
    return false
  }
  return true
}
