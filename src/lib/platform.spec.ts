import { describe, expect, it } from 'vitest'
import { modifierKeyLabel, windowControlSide } from '~/lib/platform'

describe('windowControlSide', () => {
  it('puts the window control on the left for macOS user agents', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'

    expect(windowControlSide(userAgent)).toBe('left')
  })

  it('puts the window control on the left for iOS user agents', () => {
    const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'

    expect(windowControlSide(userAgent)).toBe('left')
  })

  it('puts the window control on the right for non-Apple user agents', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

    expect(windowControlSide(userAgent)).toBe('right')
  })
})

describe('modifierKeyLabel', () => {
  it('uses the command symbol on macOS', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'

    expect(modifierKeyLabel(userAgent)).toBe('⌘')
  })

  it('uses Ctrl on non-Apple platforms', () => {
    const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)'

    expect(modifierKeyLabel(userAgent)).toBe('Ctrl')
  })
})
