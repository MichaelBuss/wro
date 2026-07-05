import { describe, expect, it } from 'vitest'
import { checkAgeBandEligibility } from './age-band'

describe('checkAgeBandEligibility', () => {
  it('returns true when the birth year is inside the band', () => {
    // RoboMission Junior 2026: ages 11-15 → birth years 2011-2015
    expect(
      checkAgeBandEligibility(2013, { minBirthYear: 2011, maxBirthYear: 2015 }),
    ).toBe(true)
  })

  it('returns true on the lower bound (oldest allowed participant)', () => {
    expect(
      checkAgeBandEligibility(2011, { minBirthYear: 2011, maxBirthYear: 2015 }),
    ).toBe(true)
  })

  it('returns true on the upper bound (youngest allowed participant)', () => {
    expect(
      checkAgeBandEligibility(2015, { minBirthYear: 2011, maxBirthYear: 2015 }),
    ).toBe(true)
  })

  it('returns false when birth year is below the minimum (participant too old)', () => {
    expect(
      checkAgeBandEligibility(2010, { minBirthYear: 2011, maxBirthYear: 2015 }),
    ).toBe(false)
  })

  it('returns false when birth year is above the maximum (participant too young)', () => {
    expect(
      checkAgeBandEligibility(2016, { minBirthYear: 2011, maxBirthYear: 2015 }),
    ).toBe(false)
  })

  it('returns true for any birth year when both bounds are null', () => {
    expect(
      checkAgeBandEligibility(2000, { minBirthYear: null, maxBirthYear: null }),
    ).toBe(true)
    expect(
      checkAgeBandEligibility(2020, { minBirthYear: null, maxBirthYear: null }),
    ).toBe(true)
  })

  it('applies only the lower bound when maxBirthYear is null', () => {
    // Participant born in 2012 is at least as recent as 2011 → in band
    expect(
      checkAgeBandEligibility(2012, { minBirthYear: 2011, maxBirthYear: null }),
    ).toBe(true)
    // Participant born in 2009 is older than the band allows → out of band
    expect(
      checkAgeBandEligibility(2009, { minBirthYear: 2011, maxBirthYear: null }),
    ).toBe(false)
  })

  it('applies only the upper bound when minBirthYear is null', () => {
    // Participant born in 2014 is within the upper bound of 2015 → in band
    expect(
      checkAgeBandEligibility(2014, { minBirthYear: null, maxBirthYear: 2015 }),
    ).toBe(true)
    // Participant born in 2016 is younger than allowed → out of band
    expect(
      checkAgeBandEligibility(2016, { minBirthYear: null, maxBirthYear: 2015 }),
    ).toBe(false)
  })
})
