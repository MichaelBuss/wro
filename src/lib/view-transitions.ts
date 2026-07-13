/**
 * Shared helpers for scoping the router's view transitions to the gallery
 * flow (homepage teaser ↔ `/galleri` ↔ `/galleri/$year` ↔ lightbox) and
 * respecting reduced-motion preferences — see `src/router.tsx` for the
 * `defaultViewTransition` wiring and the lightbox's prev/next overrides.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Returns `types` unless the visitor prefers reduced motion, in which case
 * it returns `false` to disable the view transition entirely.
 */
export function galleryTransitionTypes(
  types: Array<string>,
): Array<string> | false {
  return prefersReducedMotion() ? false : types
}
