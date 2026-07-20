/**
 * Centralizes OS-specific UI conventions so individual components don't
 * each reinvent user-agent sniffing. Extend here as new platform-specific
 * decisions come up.
 */

function isApplePlatform(userAgent: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(userAgent)
}

export type WindowControlSide = 'left' | 'right'

/**
 * macOS puts window controls (traffic lights) on the left; Windows/Linux
 * convention is the right. Mirrors that for in-app "window-like" chrome
 * (e.g. a lightbox's close button) so it feels native on each platform.
 */
export function windowControlSide(userAgent: string): WindowControlSide {
  return isApplePlatform(userAgent) ? 'left' : 'right'
}

/** ⌘ on macOS, Ctrl elsewhere — for keyboard-shortcut hints in UI copy. */
export function modifierKeyLabel(userAgent: string): string {
  return isApplePlatform(userAgent) ? '⌘' : 'Ctrl'
}
